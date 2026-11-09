// === NH_DATA_SEARCHPATH ===========================================================
// Fungsi: menambah folder data hasil unduhan Data Manager ke search path cocos2d-x,
// supaya armatures/, costume/, sound/ ditemukan walau tidak ada di dalam APK.
(function NH_DATA_SEARCHPATH() {
    function say(m) { try { if (typeof log === 'function') log('NH_SP ' + m); } catch (e) {} }
    try {
        var fu = cc.FileUtils.getInstance();
        var root = String(fu.getWritablePath());          // .../files/
        if (root.charAt(root.length - 1) !== '/') root += '/';
        var p = root + 'nh-ota/releases/1.0.0/';          // sama dengan Sync.dir di Data Manager
        var has = false;
        try {
            var cur = fu.getSearchPaths ? fu.getSearchPaths() : null;
            if (cur) for (var i = 0; i < cur.length; i++) if (String(cur[i]) === p) has = true;
        } catch (e1) {}
        // data paling depan (menang atas APK); sisanya urutan lama
        var list = [];
        try { list = fu.getSearchPaths ? fu.getSearchPaths() : []; } catch (e3) {}
        var arr = [p];
        for (var j = 0; j < list.length; j++) if (String(list[j]) !== p) arr.push(String(list[j]));
        if (fu.setSearchPaths) fu.setSearchPaths(arr); else if (!has) fu.addSearchPath(p);
        var rel = 'armatures/Export/yun/yun.ExportJson', full = '';
        try { full = String(fu.fullPathForFilename(rel)); } catch (e2) {}
        say('path=' + p + ' abs_exists=' + fu.isFileExist(p + rel) + ' resolved=' + full);
    } catch (e) { say('ERROR ' + e); }
})();
// ==================================================================================
var __NH_BACKEND_CONFIG={"http": "http://192.168.100.87/ninja", "gameHost": "192.168.100.87", "wsPort": 8080, "version": "1.0.9"};
// === NH_SAFETY_GUARDS =============================================================
// Mengamankan crash native C++ pada TalkingData, JSBTools, AnySDK, CommonJsb,
// EditBox, dan Scene lifecycle pada LDPlayer / emulator Android.
(function NH_INSTALL_SAFETY_GUARDS() {
    function say(m) {
        try {
            if (typeof log === 'function') log('[NH Guard] ' + m);
            else if (typeof cc !== 'undefined' && typeof cc.log === 'function') cc.log('[NH Guard] ' + m);
        } catch (e) {}
    }

    say('Installing TalkingData and Native Crash Guards...');

    // 1. Safe cc.log wrapper
    try {
        if (typeof cc !== 'undefined' && typeof cc.log === 'function' && !cc.log.__nhSafe) {
            var _origCCLog = cc.log;
            var safeLog = function () {
                try {
                    var parts = [];
                    for (var i = 0; i < arguments.length; i++) {
                        var a = arguments[i];
                        if (a === null) parts.push('null');
                        else if (typeof a === 'undefined') parts.push('undefined');
                        else if (typeof a === 'object') {
                            try { parts.push(JSON.stringify(a)); } catch (je) { parts.push(String(a)); }
                        } else {
                            parts.push(String(a));
                        }
                    }
                    return _origCCLog.call(cc, '%s', parts.join(' '));
                } catch (err) {
                    // ignore logger failures
                }
            };
            safeLog.__nhSafe = true;
            cc.log = safeLog;
        }
    } catch (eLog) {}

    // 1b. Global Error Interceptor to prevent native SpiderMonkey crash in js_ReportErrorAgain
    try {
        if (typeof window !== 'undefined') {
            window.onerror = function (msg, url, line) {
                say('[Intercepted JS Error] ' + msg + ' (' + url + ':' + line + ')');
                return true;
            };
        }
        if (typeof sys !== 'undefined' && sys) {
            sys.onError = function (msg) {
                say('[Intercepted Sys Error] ' + msg);
                return true;
            };
        }
    } catch (eTrap) {}

    // 1c. Safe polyfill for Array.prototype.forEach and CCNode getChildren
    try {
        if (!Array.prototype.forEach) {
            Array.prototype.forEach = function (callback, thisArg) {
                for (var idx = 0; idx < this.length; idx++) {
                    callback.call(thisArg, this[idx], idx, this);
                }
            };
        }
    } catch (eArr) {}

    try {
        var patchGetChildren = function (targetProto) {
            if (!targetProto || !targetProto.getChildren || targetProto.getChildren.__nhSafe) return;
            var _orig = targetProto.getChildren;
            var safeGetChildren = function () {
                var ch = null;
                try {
                    ch = _orig.apply(this, arguments);
                } catch (eCh) {}
                if (!ch) ch = [];
                if (!ch.forEach) {
                    ch.forEach = function (cb, ctx) {
                        for (var i = 0; i < this.length; i++) {
                            cb.call(ctx, this[i], i, this);
                        }
                    };
                }
                return ch;
            };
            safeGetChildren.__nhSafe = true;
            targetProto.getChildren = safeGetChildren;
        };

        if (typeof cc !== 'undefined') {
            if (cc.Node && cc.Node.prototype) patchGetChildren(cc.Node.prototype);
            if (cc.Layer && cc.Layer.prototype) patchGetChildren(cc.Layer.prototype);
            if (cc.Scene && cc.Scene.prototype) patchGetChildren(cc.Scene.prototype);
            if (cc.Sprite && cc.Sprite.prototype) patchGetChildren(cc.Sprite.prototype);
        }
    } catch (eNode) {}

    // 1d. Safe GameTools.prototype.onTouchesHit ensuring hidden layers cannot intercept touches
    try {
        if (typeof GameTools !== 'undefined' && GameTools.prototype && !GameTools.prototype.__nhHitGuarded) {
            var _origTouchesHit = GameTools.prototype.onTouchesHit;
            GameTools.prototype.onTouchesHit = function (touch, touchList) {
                if (!touch || !touchList || !touchList.length) return null;
                try {
                    var safeList = [];
                    for (var i = 0; i < touchList.length; i++) {
                        var item = touchList[i];
                        if (!item) continue;
                        if (typeof item.isVisible === 'function' && !item.isVisible()) continue;
                        var cur = (typeof item.getParent === 'function') ? item.getParent() : null;
                        var visibleHierarchy = true;
                        while (cur) {
                            if (typeof cur.isVisible === 'function' && !cur.isVisible()) {
                                visibleHierarchy = false;
                                break;
                            }
                            cur = (typeof cur.getParent === 'function') ? cur.getParent() : null;
                        }
                        if (visibleHierarchy) {
                            safeList.push(item);
                        }
                    }
                    return _origTouchesHit.call(this, touch, safeList.length > 0 ? safeList : touchList);
                } catch (eTouches) {
                    return _origTouchesHit.call(this, touch, touchList);
                }
            };
            GameTools.prototype.__nhHitGuarded = true;
        }
    } catch (eHit) {}

    // 1e. Safe UserData giftStatus & activity guards to prevent scene init crashes
    try {
        if (typeof UserData !== 'undefined' && UserData.prototype) {
            UserData.prototype.giftStatus = {};
            UserData.prototype.giftValue = {};
            UserData.prototype.giftDay = 0;
            UserData.prototype.spoint = 0;
            UserData.prototype.operStatus = 0;
            UserData.prototype.fund = 1;
            UserData.prototype.mCard = 0;
            UserData.prototype.unlockSkillLv = 3;
            UserData.prototype.isOpenMonthCard = 1;
            UserData.prototype.isOpenGiftCode = 1;

            if (UserData.prototype.isHDCompleted && !UserData.prototype.isHDCompleted.__nhSafe) {
                var _origIsHD = UserData.prototype.isHDCompleted;
                UserData.prototype.isHDCompleted = function (id) {
                    try {
                        if (!this.giftStatus) this.giftStatus = {};
                        return _origIsHD.call(this, id);
                    } catch (eHD) {
                        return true;
                    }
                };
                UserData.prototype.isHDCompleted.__nhSafe = true;
            }

            if (UserData.prototype.isHasJCHDPrizeReceive && !UserData.prototype.isHasJCHDPrizeReceive.__nhSafe) {
                var _origHasPrize = UserData.prototype.isHasJCHDPrizeReceive;
                UserData.prototype.isHasJCHDPrizeReceive = function () {
                    try {
                        if (!this.giftStatus) this.giftStatus = {};
                        return _origHasPrize.apply(this, arguments);
                    } catch (ePrize) {
                        return false;
                    }
                };
                UserData.prototype.isHasJCHDPrizeReceive.__nhSafe = true;
            }

            if (typeof UserData.getInstance === 'function') {
                try {
                    var uInst = UserData.getInstance();
                    if (uInst) {
                        uInst.giftStatus = uInst.giftStatus || {};
                        uInst.giftValue = uInst.giftValue || {};
                    }
                } catch (eUInst) {}
            }
        }
    } catch (eUD) {}

    // 2. Neutralize TalkingData
    var safeNoop = function () { return true; };
    try {
        if (typeof TalkingData !== 'undefined' && TalkingData.prototype) {
            var tdMethods = [
                'loading', 'guideStep', 'onReward', 'onCost', 'chargeRequest',
                'chargeSuccess', 'setAccount', 'employNanja', 'missionAdv',
                'missionExam', 'missionYRT', 'wantedTask', 'arena', 'treasureHunt',
                'dailyReward', 'freeFunction', 'hotSpring', 'nanjaRoom',
                'nanjaRoomReachMaximum', 'nanjaRoomGetEnergy', 'skillSchool',
                'tlCollege', 'transferXJ', 'wsjt', 'lhht'
            ];
            for (var mIdx = 0; mIdx < tdMethods.length; mIdx++) {
                TalkingData.prototype[tdMethods[mIdx]] = safeNoop;
            }
        }
    } catch (eTDProto) {}

    try {
        if (typeof talkingData !== 'undefined' && talkingData) {
            talkingData.loading = safeNoop;
            talkingData.guideStep = safeNoop;
            talkingData.onReward = safeNoop;
            talkingData.onCost = safeNoop;
            talkingData.chargeRequest = safeNoop;
            talkingData.chargeSuccess = safeNoop;
            talkingData.setAccount = safeNoop;
            talkingData.employNanja = safeNoop;
            talkingData.missionAdv = safeNoop;
            talkingData.missionExam = safeNoop;
            talkingData.missionYRT = safeNoop;
            talkingData.wantedTask = safeNoop;
            talkingData.arena = safeNoop;
            talkingData.treasureHunt = safeNoop;
            talkingData.dailyReward = safeNoop;
            talkingData.freeFunction = safeNoop;
            talkingData.hotSpring = safeNoop;
            talkingData.nanjaRoom = safeNoop;
            talkingData.nanjaRoomReachMaximum = safeNoop;
            talkingData.nanjaRoomGetEnergy = safeNoop;
            talkingData.skillSchool = safeNoop;
            talkingData.tlCollege = safeNoop;
            talkingData.transferXJ = safeNoop;
            talkingData.wsjt = safeNoop;
            talkingData.lhht = safeNoop;
            // Guide step constants
            talkingData.L_LOGIN_SCENE = 1;
            talkingData.L_REGISTER_SCENE = 2;
        }
    } catch (eTDInst) {}

    // 3. Neutralize native JSBTools analytics methods
    try {
        var jsbAnalyticsMethods = [
            'onGuideStep', 'onTalkingDataStart', 'onCommonEvent', 'onPurchaseItem',
            'onReward', 'onCost', 'onMissionBegin', 'onMissionComplete',
            'onChargeRequest', 'onChargeSuccess', 'onCustomerEvent', 'setAccount',
            'onUseItem', 'trackEvent'
        ];
        if (typeof ts !== 'undefined' && ts.JSBTools && ts.JSBTools.prototype) {
            for (var jIdx = 0; jIdx < jsbAnalyticsMethods.length; jIdx++) {
                ts.JSBTools.prototype[jsbAnalyticsMethods[jIdx]] = safeNoop;
            }
        }
        if (typeof jsbTools !== 'undefined' && jsbTools) {
            for (var jIdx2 = 0; jIdx2 < jsbAnalyticsMethods.length; jIdx2++) {
                jsbTools[jsbAnalyticsMethods[jIdx2]] = safeNoop;
            }
        }
    } catch (eJSB) {}

    // 4. Neutralize AnySDK and CommonJsb external calls
    try {
        if (typeof anySDK !== 'undefined' && anySDK) {
            anySDK.switchAccount = function () { say('anySDK.switchAccount ignored'); return true; };
            anySDK.loginChannel = safeNoop;
            anySDK.buy = safeNoop;
        }
        if (typeof commonJsb !== 'undefined' && commonJsb) {
            commonJsb.switchAccount = function () { say('commonJsb.switchAccount ignored'); return true; };
        }
    } catch (eAny) {}

    // 5. Ensure serverUtil.getSDKType returns safe value "0" (standalone)
    try {
        if (typeof serverUtil !== 'undefined' && serverUtil) {
            var origGetSDK = serverUtil.getSDKType;
            serverUtil.getSDKType = function () {
                var res = origGetSDK ? origGetSDK.apply(this, arguments) : null;
                if (!res || res === "null" || res === "undefined") return "0";
                return res;
            };
        }
    } catch (eSDK) {}

    // 6. Guard RegisterBox and relax account validation
    try {
        if (typeof RegisterBox !== 'undefined' && RegisterBox.prototype && !RegisterBox.prototype.__nhGuarded) {
            var origRegCCB = RegisterBox.prototype.onDidLoadFromCCB;
            if (typeof origRegCCB === 'function') {
                RegisterBox.prototype.onDidLoadFromCCB = function () {
                    try {
                        return origRegCCB.apply(this, arguments);
                    } catch (err) {
                        say('RegisterBox onDidLoadFromCCB caught: ' + err);
                    }
                };
            }

            // Relax checkAccountAndPwd on RegisterBox so usernames without @ are accepted
            RegisterBox.prototype.checkAccountAndPwd = function () {
                var acc = "", pwd = "";
                if (this.mailTTF && typeof this.mailTTF.getText === 'function') acc = this.mailTTF.getText();
                if (this.pwdTTF && typeof this.pwdTTF.getText === 'function') pwd = this.pwdTTF.getText();
                acc = String(acc || "").trim();
                pwd = String(pwd || "").trim();

                if (!acc || acc.length < 3) {
                    if (typeof PromptView !== 'undefined' && PromptView.setPageView) {
                        PromptView.setPageView("loginTip", { target: this, text: "Username/Email minimal 3 karakter." });
                    }
                    return;
                }
                if (!pwd || pwd.length < 1) {
                    if (typeof PromptView !== 'undefined' && PromptView.setPageView) {
                        PromptView.setPageView("loginTip", { target: this, text: "Silakan masukkan password." });
                    }
                    return;
                }

                var channel = 1;
                if (typeof serverUtil !== 'undefined' && serverUtil.getChannel) {
                    channel = serverUtil.getChannel();
                }

                return {
                    accId: acc.toLowerCase(),
                    pwd: pwd.toLowerCase(),
                    channel: channel,
                    lv: 1
                };
            };

            RegisterBox.prototype.__nhGuarded = true;
            say('RegisterBox protected successfully.');
        }
    } catch (eReg) {
        say('Error guarding RegisterBox: ' + eReg);
    }

    // 7. Guard LoginScene and all related lifecycle & switchLayer methods
    try {
        if (typeof LoginScene !== 'undefined' && LoginScene.prototype) {
            // Guard enterLoginSceneScheduleOnce
            LoginScene.prototype.enterLoginSceneScheduleOnce = function () {
                say('enterLoginSceneScheduleOnce called safely.');
                try {
                    if (this.controller && typeof this.controller.onPressToRegister === 'function') {
                        return this.controller.onPressToRegister();
                    }
                } catch (eLoginOnce) {
                    say('enterLoginSceneScheduleOnce error: ' + eLoginOnce);
                }
            };

            // Guard startInitUI to safely assign button types and touches
            LoginScene.prototype.startInitUI = function (arg) {
                say('Safe startInitUI invoked.');
                try {
                    if (typeof DeleteData !== 'undefined') {
                        try { DeleteData(); } catch (eDel) {}
                    }
                    var btnTags = {
                        bt_serverInfo: "showServers",
                        bt_fastEntrance: "fastEntrance",
                        bt_register: "toRegister",
                        bt_enterGame: "enterGame",
                        bt_currentServer: "backToEntrance",
                        bt_facebook: "loginFacebook",
                        bt_googleplus: "loginGooglePlus",
                        btn_login: "btn_login",
                        btn_signup: "btn_signup",
                        btn_create: "btn_create",
                        btn_back: "btn_back"
                    };
                    for (var bName in btnTags) {
                        if (this[bName]) {
                            this[bName]._ty = btnTags[bName];
                        }
                    }
                    var winSize = cc.Director.getInstance().getVisibleSize();
                    var origin = cc.Director.getInstance().getVisibleOrigin ? cc.Director.getInstance().getVisibleOrigin() : cc.p(0, 0);
                    var cx = origin.x + winSize.width / 2;
                    var cy = origin.y + winSize.height / 2;

                    var getLocalCenter = function (layer, wX, wY) {
                        if (!layer) return cc.p(wX, wY);
                        try {
                            if (typeof layer.convertToNodeSpace === 'function') {
                                return layer.convertToNodeSpace(cc.p(wX, wY));
                            }
                        } catch (eConv) {}
                        var pos = layer.getPosition ? layer.getPosition() : cc.p(0, 0);
                        return cc.p(wX - pos.x, wY - pos.y);
                    };

                    // Customize RegButtonLayer buttons with responsive layout
                    if (this.RegButtonLayer) {
                        var regCenter = getLocalCenter(this.RegButtonLayer, cx, cy);

                        // 1. Add / configure Google Login button on RegButtonLayer
                        if (!this.regGoogleBtn) {
                            try {
                                var gBtn = cc.Sprite.create("image/ibg/bt_login_google.png");
                                if (gBtn) {
                                    gBtn._ty = "loginGooglePlus";
                                    gBtn.setAnchorPoint(cc.p(0.5, 0.5));
                                    gBtn.setPosition(cc.p(regCenter.x, regCenter.y + 45));
                                    this.RegButtonLayer.addChild(gBtn, 10);
                                    this.regGoogleBtn = gBtn;
                                }
                            } catch (eGBtn) {}
                        } else {
                            this.regGoogleBtn.setAnchorPoint(cc.p(0.5, 0.5));
                            this.regGoogleBtn.setPosition(cc.p(regCenter.x, regCenter.y + 45));
                            this.regGoogleBtn.setVisible(true);
                        }

                        // 2. Transform bt_fastEntrance into a LOGIN button centered below Google button
                        if (this.bt_fastEntrance) {
                            try {
                                var loginTex = cc.TextureCache.getInstance().addImage("image/ibg/btn_login.png");
                                if (loginTex && typeof this.bt_fastEntrance.setTexture === 'function') {
                                    this.bt_fastEntrance.setTexture(loginTex);
                                    if (typeof this.bt_fastEntrance.setTextureRect === 'function') {
                                        this.bt_fastEntrance.setTextureRect(cc.rect(0, 0, loginTex.getContentSize().width, loginTex.getContentSize().height));
                                    }
                                }
                            } catch (eTex) {}
                            this.bt_fastEntrance.setAnchorPoint(cc.p(0.5, 0.5));
                            this.bt_fastEntrance.setPosition(cc.p(regCenter.x, regCenter.y - 35));
                            this.bt_fastEntrance.setVisible(true);
                        }

                        // 3. Position Register button below Login button
                        if (this.bt_register) {
                            this.bt_register.setAnchorPoint(cc.p(0.5, 0.5));
                            this.bt_register.setPosition(cc.p(regCenter.x, regCenter.y - 110));
                            this.bt_register.setVisible(true);
                        }
                    }

                    var candidateTouches = [
                        this.bt_register, this.bt_enterGame, this.bt_currentServer,
                        this.bt_facebook, this.btn_login, this.btn_signup,
                        this.btn_create, this.btn_back, this.bt_serverInfo,
                        this.bt_fastEntrance, this.bt_googleplus, this.regGoogleBtn
                    ];
                    this.toucheList = [];
                    for (var ti = 0; ti < candidateTouches.length; ti++) {
                        if (candidateTouches[ti]) {
                            this.toucheList.push(candidateTouches[ti]);
                        }
                    }
                    if (typeof GameTools !== 'undefined' && GameTools.getInstance) {
                        try { GameTools.getInstance().addTouches(this); } catch (eTouch) {}
                    }
                    if (typeof this.setEnabledAll === 'function') {
                        try { this.setEnabledAll(true); } catch (eEn) {}
                    }
                    // Version label
                    try {
                        var vText = "v" + (typeof serverUtil !== 'undefined' && serverUtil.getVersion ? serverUtil.getVersion() : "1.0.0");
                        var vLabel = cc.LabelTTF.create(vText, "Helvetica", 20, cc.size(0, 0), cc.TEXT_ALIGNMENT_LEFT);
                        if (vLabel) {
                            vLabel.setPosition(cc.p(19 * winSize.width / 20, 30));
                            vLabel.setColor(cc.c3b(0, 0, 0));
                            if (this.rootNode) this.rootNode.addChild(vLabel);
                        }
                    } catch (eVLabel) {}

                    if (arg && arg.switchAccount) {
                        if (typeof this.switchLayer === 'function') this.switchLayer(null);
                        if (this.rootNode && typeof this.rootNode.scheduleOnce === 'function') {
                            this.rootNode.scheduleOnce(this.enterLoginSceneScheduleOnce, 1);
                        }
                    } else if (arg && arg.tipCallBack) {
                        if (typeof this.showEntranceLayer === 'function') this.showEntranceLayer();
                    } else {
                        if (typeof this.checkServerList === 'function') this.checkServerList();
                    }

                    try {
                        if (typeof ArmatureLoad !== 'undefined' && ArmatureLoad.getInstance) {
                            ArmatureLoad.getInstance().setDataList("mainAction", 1);
                            ArmatureLoad.getInstance().setDataList("building", 1);
                            ArmatureLoad.getInstance().setDataList("ui", 1);
                        }
                    } catch (eArm) {}
                } catch (eFatalInit) {
                    say('Fatal error in startInitUI intercepted: ' + eFatalInit);
                }
            };

            // Recursive node visibility helper
            var setNodeVisibleRecursive = function (node, vis) {
                if (!node) return;
                try {
                    if (typeof node.setVisible === 'function') node.setVisible(vis);
                    var chs = (typeof node.getChildren === 'function') ? node.getChildren() : [];
                    for (var ci = 0; ci < chs.length; ci++) {
                        setNodeVisibleRecursive(chs[ci], vis);
                    }
                } catch (eVis) {}
            };

            // Responsive Layout Helper
            LoginScene.prototype.applyResponsiveLoginLayout = function () {
                say('applyResponsiveLoginLayout invoked.');
                try {
                    var winSize = cc.Director.getInstance().getVisibleSize();
                    var origin = cc.Director.getInstance().getVisibleOrigin ? cc.Director.getInstance().getVisibleOrigin() : cc.p(0, 0);
                    var cx = origin.x + winSize.width / 2;
                    var cy = origin.y + winSize.height / 2;

                    var getLocalCenter = function (layer, wX, wY) {
                        if (!layer) return cc.p(wX, wY);
                        try {
                            if (typeof layer.convertToNodeSpace === 'function') {
                                return layer.convertToNodeSpace(cc.p(wX, wY));
                            }
                        } catch (eConv) {}
                        var pos = (typeof layer.getPosition === 'function') ? layer.getPosition() : cc.p(0, 0);
                        return cc.p(wX - pos.x, wY - pos.y);
                    };

                    // Robust position helper: translates target screen/world coords into the node's parent coordinate space
                    var positionNodeAt = function (node, wX, wY, anchorX, anchorY) {
                        if (!node) return;
                        try {
                            if (typeof node.ignoreAnchorPointForPosition === 'function') {
                                node.ignoreAnchorPointForPosition(false);
                            }
                            if (typeof node.setAnchorPoint === 'function') {
                                node.setAnchorPoint(cc.p(anchorX !== undefined ? anchorX : 0.5, anchorY !== undefined ? anchorY : 0.5));
                            }
                            var p = (typeof node.getParent === 'function') ? node.getParent() : null;
                            var localPos = cc.p(wX, wY);
                            if (p) {
                                try {
                                    if (typeof p.convertToNodeSpace === 'function') {
                                        localPos = p.convertToNodeSpace(cc.p(wX, wY));
                                    } else {
                                        var pPos = (typeof p.getPosition === 'function') ? p.getPosition() : cc.p(0, 0);
                                        localPos = cc.p(wX - pPos.x, wY - pPos.y);
                                    }
                                } catch (eConv) {
                                    var pPos2 = (typeof p.getPosition === 'function') ? p.getPosition() : cc.p(0, 0);
                                    localPos = cc.p(wX - pPos2.x, wY - pPos2.y);
                                }
                            }
                            if (typeof node.setPosition === 'function') {
                                node.setPosition(localPos);
                            }
                            if (typeof node.setVisible === 'function') {
                                node.setVisible(true);
                            }
                        } catch (ePos) {
                            say('positionNodeAt error: ' + ePos);
                        }
                    };

                    var isChan = !!(this.currentLayer && (this.currentLayer === this.ChannelLayer || this.currentLayer === this.ChannelLayer_signup));
                    var isEnt = !!(this.currentLayer && this.currentLayer === this.EntranceLayer);
                    var isSrv = !!(this.currentLayer && this.currentLayer === this.ServerListLayer);
                    var isReg = (!isChan && !isEnt && !isSrv);

                    say('applyResponsiveLoginLayout state: isReg=' + isReg + ' isChan=' + isChan + ' isEnt=' + isEnt + ' isSrv=' + isSrv + ' cx=' + cx + ' cy=' + cy);

                    // 1. Responsive RegButtonLayer (Welcome: Google, Login, Register)
                    if (this.RegButtonLayer) {
                        if (isReg) {
                            setNodeVisibleRecursive(this.RegButtonLayer, true);
                            if (this.regGoogleBtn) {
                                positionNodeAt(this.regGoogleBtn, cx, cy + 45, 0.5, 0.5);
                                this.regGoogleBtn._ty = "loginGooglePlus";
                            }
                            if (this.bt_fastEntrance) {
                                positionNodeAt(this.bt_fastEntrance, cx, cy - 35, 0.5, 0.5);
                                this.bt_fastEntrance._ty = "fastEntrance";
                            }
                            if (this.bt_register) {
                                positionNodeAt(this.bt_register, cx, cy - 110, 0.5, 0.5);
                                this.bt_register._ty = "toRegister";
                            }
                        } else {
                            setNodeVisibleRecursive(this.RegButtonLayer, false);
                        }
                    }

                    // 2. Responsive ChannelLayer (Login Dialog) & ChannelLayer_signup (Register Dialog)
                    var isLoginLayer = !!(this.currentLayer && this.currentLayer === this.ChannelLayer);
                    var isSignupLayer = !!(this.currentLayer && this.currentLayer === this.ChannelLayer_signup);

                    if (this.ChannelLayer) {
                        if (isLoginLayer) {
                            setNodeVisibleRecursive(this.ChannelLayer, true);

                            // Background dialog: Scale9Sprite diperlebar ke 460x470 agar seluruh elemen muat rapi di dalam card
                            var chList = (typeof this.ChannelLayer.getChildren === 'function') ? this.ChannelLayer.getChildren() : [];
                            for (var ci = 0; ci < chList.length; ci++) {
                                var ch = chList[ci];
                                if (!ch) continue;
                                // Sembunyikan label teks statis CCB ("Email", "Input Password") agar tidak menumpuk dengan placeholder
                                if (typeof ch.getString === 'function') {
                                    ch.setVisible(false);
                                }
                                if (typeof ch.getContentSize === 'function') {
                                    var cSz = ch.getContentSize();
                                    say('ChannelLayer child[' + ci + '] sz=' + (cSz ? (cSz.width + 'x' + cSz.height) : 'none'));
                                    if (cSz && cSz.width > 350 && cSz.height > 250) {
                                        if (typeof ch.setPreferredSize === 'function') {
                                            ch.setPreferredSize(cc.size(460, 470));
                                        }
                                        if (typeof ch.setContentSize === 'function') {
                                            ch.setContentSize(cc.size(460, 470));
                                        }
                                        positionNodeAt(ch, cx, cy - 37, 0.5, 0.5);
                                    }
                                }
                            }

                            // Input fields: Username & Password diturunkan lagi agar pas di tengah modal
                            var nameBox = this.img_input_name;
                            if (nameBox) {
                                positionNodeAt(nameBox, cx, cy + 57, 0.5, 0.5);
                                if (this.mailTTF && typeof this.mailTTF.setPosition === 'function') {
                                    this.mailTTF.setPosition(cc.p(0, 0));
                                }
                            }
                            var pwdBox = this.img_input_password;
                            if (pwdBox) {
                                positionNodeAt(pwdBox, cx, cy - 5, 0.5, 0.5);
                                if (this.pwdTTF1 && typeof this.pwdTTF1.setPosition === 'function') {
                                    this.pwdTTF1.setPosition(cc.p(0, 0));
                                }
                                if (this.pwdTTF && typeof this.pwdTTF.setPosition === 'function') {
                                    this.pwdTTF.setPosition(cc.p(0, 0));
                                }
                            }

                            // Tombol LOGIN
                            if (this.btn_login) {
                                positionNodeAt(this.btn_login, cx, cy - 79, 0.5, 0.5);
                                this.btn_login.setVisible(true);
                                this.btn_login._ty = "btn_login";
                            }

                            // Tombol Sign in with Google
                            if (this.bt_googleplus) {
                                positionNodeAt(this.bt_googleplus, cx, cy - 159, 0.5, 0.5);
                                this.bt_googleplus.setVisible(true);
                                this.bt_googleplus._ty = "loginGooglePlus";
                            }
                            if (this.bt_facebook) this.bt_facebook.setVisible(false);

                            // Baris Bawah: Tombol KEMBALI (kiri) & SIGN UP (kanan)
                            if (this.btn_back) {
                                if (typeof this.btn_back.setScale === 'function') this.btn_back.setScale(0.78);
                                positionNodeAt(this.btn_back, cx - 100, cy - 227, 0.5, 0.5);
                                this.btn_back.setVisible(true);
                                this.btn_back._ty = "btn_back";
                            }
                            if (this.btn_signup) {
                                if (typeof this.btn_signup.setScale === 'function') this.btn_signup.setScale(1.0);
                                positionNodeAt(this.btn_signup, cx + 100, cy - 227, 0.5, 0.5);
                                this.btn_signup.setVisible(true);
                                this.btn_signup._ty = "btn_signup";
                            }
                        } else {
                            setNodeVisibleRecursive(this.ChannelLayer, false);
                        }
                    }

                    if (this.ChannelLayer_signup) {
                        if (isSignupLayer) {
                            setNodeVisibleRecursive(this.ChannelLayer_signup, true);

                            // Background dialog Register
                            var suList = (typeof this.ChannelLayer_signup.getChildren === 'function') ? this.ChannelLayer_signup.getChildren() : [];
                            for (var si = 0; si < suList.length; si++) {
                                var such = suList[si];
                                if (!such) continue;
                                if (typeof such.getString === 'function') {
                                    such.setVisible(false);
                                }
                                if (typeof such.getContentSize === 'function') {
                                    var suSz = such.getContentSize();
                                    say('ChannelLayer_signup child[' + si + '] sz=' + (suSz ? (suSz.width + 'x' + suSz.height) : 'none'));
                                    if (suSz && suSz.width > 350 && suSz.height > 250) {
                                        if (typeof such.setPreferredSize === 'function') {
                                            such.setPreferredSize(cc.size(460, 480));
                                        }
                                        if (typeof such.setContentSize === 'function') {
                                            such.setContentSize(cc.size(460, 480));
                                        }
                                        positionNodeAt(such, cx, cy - 37, 0.5, 0.5);
                                    }
                                }
                            }

                            // 3 Input field pendaftaran (posisi diturunkan secara proporsional)
                            if (this.img_login_name) {
                                positionNodeAt(this.img_login_name, cx, cy + 57, 0.5, 0.5);
                                if (this.mailTTF && typeof this.mailTTF.setPosition === 'function') {
                                    this.mailTTF.setPosition(cc.p(0, 0));
                                }
                            }
                            if (this.img_login_password1) {
                                positionNodeAt(this.img_login_password1, cx, cy - 3, 0.5, 0.5);
                                if (this.pwdTTF1 && typeof this.pwdTTF1.setPosition === 'function') {
                                    this.pwdTTF1.setPosition(cc.p(0, 0));
                                }
                            }
                            if (this.img_login_password2) {
                                positionNodeAt(this.img_login_password2, cx, cy - 63, 0.5, 0.5);
                                if (this.pwdTTF2 && typeof this.pwdTTF2.setPosition === 'function') {
                                    this.pwdTTF2.setPosition(cc.p(0, 0));
                                }
                            }

                            // Tombol DAFTAR (btn_create)
                            if (this.btn_create) {
                                positionNodeAt(this.btn_create, cx, cy - 137, 0.5, 0.5);
                                this.btn_create.setVisible(true);
                                this.btn_create._ty = "btn_create";
                            }

                            // Tombol KEMBALI
                            if (this.btn_back) {
                                if (typeof this.btn_back.setScale === 'function') this.btn_back.setScale(0.78);
                                positionNodeAt(this.btn_back, cx, cy - 211, 0.5, 0.5);
                                this.btn_back.setVisible(true);
                                this.btn_back._ty = "btn_back";
                            }
                        } else {
                            setNodeVisibleRecursive(this.ChannelLayer_signup, false);
                        }
                    }

                    // 3. Responsive EntranceLayer (Server Selection & Enter Game)
                    if (this.EntranceLayer) {
                        if (isEnt) {
                            setNodeVisibleRecursive(this.EntranceLayer, true);

                            // IMPORTANT: Hide original CCB btn_back so it does NOT overlap with GANTI AKUN
                            if (this.btn_back) {
                                this.btn_back.setVisible(false);
                            }
                            if (this.TipTTF) {
                                this.TipTTF.setVisible(false);
                            }

                            // Distinct, comfortable vertical spacing relative to screen center cy
                            var serverCardY = cy + 45;
                            var enterGameY = cy - 40;
                            var switchAccY = cy - 128;

                            // 1. Hide bt_currentServer on EntranceLayer (it belongs to ServerListLayer)
                            if (this.bt_currentServer) {
                                this.bt_currentServer.setVisible(false);
                            }

                            // 2. Position Server Card Button Background (bt_serverInfo)
                            if (this.bt_serverInfo) {
                                positionNodeAt(this.bt_serverInfo, cx, serverCardY, 0.5, 0.5);
                                this.bt_serverInfo._ty = "showServers";
                                this.bt_serverInfo.setVisible(true);
                            }

                            // 3. Format & Position Server Labels directly inside ServerNameLayer
                            var srvName = "S1 - Konoha Village";
                            var srvId = "1";
                            try {
                                if (typeof serverUtil !== 'undefined' && serverUtil.getServerById) {
                                    var sObj = serverUtil.getServerById(this.lastSid || 1);
                                    if (sObj && sObj[1]) {
                                        srvName = sObj[1];
                                        srvId = "" + (sObj[0] || 1);
                                    }
                                }
                            } catch (eSName) {}

                            // Position ServerNameLayer container directly over bt_serverInfo
                            if (this.ServerNameLayer) {
                                positionNodeAt(this.ServerNameLayer, cx, serverCardY, 0.5, 0.5);
                                this.ServerNameLayer.setVisible(true);
                                this.ServerNameLayer._ty = "showServers";

                                var snSz = this.ServerNameLayer.getContentSize();
                                var snW = (snSz && snSz.width > 0) ? snSz.width : 465;
                                var snH = (snSz && snSz.height > 0) ? snSz.height : 65;
                                var midY = snH / 2;

                                // Server ID badge (left side inside ServerNameLayer)
                                if (this.SIdTTF) {
                                    var curId = (typeof this.SIdTTF.getString === 'function') ? this.SIdTTF.getString() : "";
                                    if (!curId || curId === "") {
                                        this.SIdTTF.setString(srvId);
                                    }
                                    if (typeof this.SIdTTF.setColor === 'function') {
                                        this.SIdTTF.setColor(cc.c3b(255, 215, 0));
                                    }
                                    if (typeof this.SIdTTF.ignoreAnchorPointForPosition === 'function') {
                                        this.SIdTTF.ignoreAnchorPointForPosition(false);
                                    }
                                    this.SIdTTF.setAnchorPoint(cc.p(0.5, 0.5));
                                    this.SIdTTF.setPosition(cc.p(48, midY));
                                    this.SIdTTF.setVisible(true);
                                }

                                // Server Name label (centered inside ServerNameLayer)
                                if (this.SNameTTF) {
                                    var curStr = (typeof this.SNameTTF.getString === 'function') ? this.SNameTTF.getString() : "";
                                    if (!curStr || curStr === "" || curStr === "No server info") {
                                        this.SNameTTF.setString(srvName);
                                    }
                                    if (typeof this.SNameTTF.setColor === 'function') {
                                        this.SNameTTF.setColor(cc.c3b(255, 255, 255));
                                    }
                                    if (typeof this.SNameTTF.ignoreAnchorPointForPosition === 'function') {
                                        this.SNameTTF.ignoreAnchorPointForPosition(false);
                                    }
                                    this.SNameTTF.setAnchorPoint(cc.p(0.5, 0.5));
                                    this.SNameTTF.setPosition(cc.p(snW / 2 - 10, midY));
                                    this.SNameTTF.setVisible(true);
                                }

                                // Elegant "Pilih Server >" indicator on the right side
                                if (!this.lbl_chooseServer) {
                                    try {
                                        var csLbl = cc.LabelTTF.create("PILIH SERVER >", "Helvetica", 14, cc.size(130, 24), cc.TEXT_ALIGNMENT_RIGHT);
                                        csLbl.setAnchorPoint(cc.p(1.0, 0.5));
                                        csLbl.setPosition(cc.p(snW - 25, midY));
                                        csLbl.setColor(cc.c3b(255, 215, 100));
                                        this.ServerNameLayer.addChild(csLbl, 15);
                                        this.lbl_chooseServer = csLbl;
                                    } catch (eCsLbl) {}
                                }
                                if (this.lbl_chooseServer) {
                                    this.lbl_chooseServer.setPosition(cc.p(snW - 25, midY));
                                    this.lbl_chooseServer.setVisible(true);
                                }
                            }

                            // 4. Position Enter Game Button (MAIN)
                            if (this.bt_enterGame) {
                                positionNodeAt(this.bt_enterGame, cx, enterGameY, 0.5, 0.5);
                                this.bt_enterGame._ty = "enterGame";
                            }

                            // 4. Switch Account Button (GANTI AKUN)
                            if (this.btn_switchAccount) {
                                try { this.btn_switchAccount.removeFromParent(); } catch (eCl) {}
                                this.btn_switchAccount = null;
                            }
                            try {
                                var swSprite = cc.Sprite.create("UI/image/btn_switch_acc.png");
                                if (!swSprite) swSprite = cc.Sprite.create("image/btn_switch_acc.png");
                                if (!swSprite) swSprite = cc.Sprite.create("image/ibg/img_login_input.png");
                                if (swSprite) {
                                    swSprite.setScale(1.0);
                                    swSprite._ty = "switchAccount";

                                    var swLbl = cc.LabelTTF.create("GANTI AKUN", "Helvetica", 18, cc.size(190, 26), cc.TEXT_ALIGNMENT_CENTER);
                                    swLbl.setPosition(cc.p(swSprite.getContentSize().width / 2, swSprite.getContentSize().height / 2));
                                    swLbl.setColor(cc.c3b(255, 255, 255));
                                    swSprite.addChild(swLbl);

                                    this.EntranceLayer.addChild(swSprite, 20);
                                    this.btn_switchAccount = swSprite;
                                }
                            } catch (eSwBtn) {
                                say('create btn_switchAccount error: ' + eSwBtn);
                            }
                            if (this.btn_switchAccount) {
                                positionNodeAt(this.btn_switchAccount, cx, switchAccY, 0.5, 0.5);
                                this.btn_switchAccount.setVisible(true);
                                this.btn_switchAccount._ty = "switchAccount";
                            }
                        } else {
                            setNodeVisibleRecursive(this.EntranceLayer, false);
                        }
                    }

                    // 4. Responsive ServerListLayer
                    if (this.ServerListLayer) {
                        if (isSrv) {
                            setNodeVisibleRecursive(this.ServerListLayer, true);
                            if (this.btn_back) {
                                positionNodeAt(this.btn_back, cx - 180, cy - 210, 0.5, 0.5);
                                this.btn_back.setVisible(true);
                                this.btn_back._ty = "backToEntrance";
                            }
                        } else {
                            setNodeVisibleRecursive(this.ServerListLayer, false);
                        }
                    }

                    // Register active touch targets only
                    this.toucheList = [];
                    var candidateTouches = [];
                    if (isLoginLayer) {
                        candidateTouches = [this.btn_login, this.bt_googleplus, this.btn_back, this.btn_signup];
                    } else if (isSignupLayer) {
                        candidateTouches = [this.btn_create, this.btn_back];
                    } else if (isEnt) {
                        candidateTouches = [this.bt_enterGame, this.bt_serverInfo, this.ServerNameLayer, this.btn_switchAccount];
                    } else if (isSrv) {
                        candidateTouches = [this.btn_back, this.ChooseServer, this.ServerLine];
                    } else {
                        candidateTouches = [this.regGoogleBtn, this.bt_fastEntrance, this.bt_register];
                    }
                    for (var ti = 0; ti < candidateTouches.length; ti++) {
                        var ct = candidateTouches[ti];
                        if (ct && this.toucheList.indexOf(ct) === -1) {
                            this.toucheList.push(ct);
                        }
                    }
                    if (typeof GameTools !== 'undefined' && GameTools.getInstance) {
                        try { GameTools.getInstance().addTouches(this); } catch (eTouch) {}
                    }
                } catch (eLay) {
                    say('applyResponsiveLoginLayout error: ' + eLay);
                }
            };

            // Override onPressFastEntrance so it never acts as guest
            LoginScene.prototype.onPressFastEntrance = function () {
                say('onPressFastEntrance intercepted -> open login directly.');
                if (typeof this.switloginchLayer === 'function') {
                    return this.switloginchLayer();
                } else if (typeof this.switchLayer === 'function') {
                    return this.switchLayer(this.ChannelLayer || null);
                }
            };

            // Guard switchLayer against null layers or overlapping layers
            LoginScene.prototype.switchLayer = function (targetLayer) {
                say('Safe switchLayer invoked with targetLayer: ' + (targetLayer ? (targetLayer === this.EntranceLayer ? 'EntranceLayer' : (targetLayer === this.ChannelLayer ? 'ChannelLayer' : (targetLayer === this.RegButtonLayer ? 'RegButtonLayer' : 'OtherLayer'))) : 'null'));
                try {
                    var knownLayers = [this.RegButtonLayer, this.ChannelLayer, this.ChannelLayer_signup, this.EntranceLayer, this.ServerListLayer];
                    for (var ki = 0; ki < knownLayers.length; ki++) {
                        var kl = knownLayers[ki];
                        if (kl && kl !== targetLayer) {
                            setNodeVisibleRecursive(kl, false);
                            if (typeof kl.setTouchEnabled === 'function') kl.setTouchEnabled(false);
                        }
                    }
                    if (targetLayer) {
                        this.currentLayer = targetLayer;
                        setNodeVisibleRecursive(targetLayer, true);
                        if (typeof targetLayer.setTouchEnabled === 'function') targetLayer.setTouchEnabled(true);
                    } else {
                        this.currentLayer = null;
                    }
                    if (this.mailTTF && typeof this.mailTTF.removeFromParent === 'function') {
                        try { this.mailTTF.removeFromParent(); } catch (eMail) {}
                    }
                    if (this.pwdTTF && typeof this.pwdTTF.removeFromParent === 'function') {
                        try { this.pwdTTF.removeFromParent(); } catch (ePwd) {}
                    }
                    if (typeof this.applyResponsiveLoginLayout === 'function') {
                        this.applyResponsiveLoginLayout();
                    }
                } catch (eSwitch) {
                    say('switchLayer error intercepted: ' + eSwitch);
                }
            };

            // Guard switloginchLayer and ensure Google button & placeHolders are ready
            LoginScene.prototype.switloginchLayer = function () {
                say('Safe switloginchLayer invoked.');
                try {
                    this.switchLayer(this.ChannelLayer);
                    if (typeof this.initeditbox === 'function') {
                        try {
                            var nb = this.img_input_name || this.img_login_name;
                            var pb = this.img_input_password || this.img_login_password1;
                            this.initeditbox(nb, pb);
                        } catch (eInitEdit) {
                            say('initeditbox error: ' + eInitEdit);
                        }
                    }
                    if (this.bt_googleplus) {
                        this.bt_googleplus.setVisible(true);
                        this.bt_googleplus._ty = "loginGooglePlus";
                        if (this.toucheList && this.toucheList.indexOf(this.bt_googleplus) === -1) {
                            this.toucheList.push(this.bt_googleplus);
                        }
                    }
                    if (this.mailTTF && typeof this.mailTTF.setPlaceHolder === 'function') {
                        this.mailTTF.setPlaceHolder("Email atau Username");
                    }
                    if (this.pwdTTF1 && typeof this.pwdTTF1.setPlaceHolder === 'function') {
                        this.pwdTTF1.setPlaceHolder("Password");
                    }
                    this.applyResponsiveLoginLayout();
                } catch (eSwLogin) {
                    say('switloginchLayer intercepted error: ' + eSwLogin);
                }
            };

            // Google Login implementation
            LoginScene.prototype.loginGooglePlus = function () {
                say('loginGooglePlus invoked.');
                var self = this;
                try {
                    var winSize = cc.Director.getInstance().getVisibleSize();
                    var winW = winSize.width;
                    var winH = winSize.height;

                    if (self.__nhGoogleModal) {
                        try { self.__nhGoogleModal.removeFromParent(); } catch (eClean) {}
                        self.__nhGoogleModal = null;
                    }

                    var modalLayer = cc.LayerColor.create(cc.c4b(0, 0, 0, 200), winW, winH);
                    modalLayer.setTouchEnabled(true);
                    self.addChild(modalLayer, 9999);
                    self.__nhGoogleModal = modalLayer;

                    var bg = cc.Scale9Sprite.create("image/ibg/img_login_bg.png");
                    bg.setContentSize(cc.size(460, 310));
                    bg.setPosition(cc.p(winW / 2, winH / 2));
                    modalLayer.addChild(bg);

                    var titleLabel = cc.LabelTTF.create("LOGIN DENGAN GOOGLE", "Helvetica", 22, cc.size(420, 32), cc.TEXT_ALIGNMENT_CENTER);
                    titleLabel.setPosition(cc.p(230, 275));
                    titleLabel.setColor(cc.c3b(255, 215, 0));
                    bg.addChild(titleLabel);

                    var subLabel = cc.LabelTTF.create("Ketik alamat Gmail Anda di bawah ini:", "Helvetica", 15, cc.size(400, 22), cc.TEXT_ALIGNMENT_CENTER);
                    subLabel.setPosition(cc.p(230, 238));
                    subLabel.setColor(cc.c3b(220, 220, 220));
                    bg.addChild(subLabel);

                    var inputBg = cc.Scale9Sprite.create("image/ibg/img_login_input.png");
                    var editBox = cc.EditBox.create(cc.size(380, 50), inputBg);
                    editBox.setPosition(cc.p(230, 180));
                    editBox.setFont("Arial", 18);
                    editBox.setFontColor(cc.c3b(0, 0, 0));
                    editBox.setPlaceHolder("nama@gmail.com");
                    editBox.setMaxLength(50);
                    editBox.setReturnType(cc.KEYBOARD_RETURNTYPE_DONE);

                    var lastGoogle = "";
                    try {
                        if (typeof sys !== 'undefined' && sys.localStorage) {
                            lastGoogle = sys.localStorage.getItem("nh_last_google_acc") || "";
                        }
                    } catch (eG) {}
                    if (lastGoogle) editBox.setText(lastGoogle);
                    bg.addChild(editBox);

                    var doGoogleLogin = function (email) {
                        email = String(email || "").trim();
                        if (!email || email.length < 3) {
                            if (typeof PromptBox !== 'undefined' && PromptBox.getInstance) {
                                try { PromptBox.getInstance().updataTxt("Silakan masukkan email Gmail!"); } catch (e) {}
                            }
                            return;
                        }
                        if (email.indexOf("@") === -1) {
                            email += "@gmail.com";
                        }
                        try {
                            if (typeof sys !== 'undefined' && sys.localStorage) {
                                sys.localStorage.setItem("nh_last_google_acc", email);
                            }
                        } catch (eG2) {}

                        try { modalLayer.removeFromParent(); } catch (e) {}
                        self.__nhGoogleModal = null;

                        if (typeof PromptBox !== 'undefined' && PromptBox.getInstance) {
                            try { PromptBox.getInstance().updataTxt("Login Google: " + email); } catch (e) {}
                        }

                        self.onPressLogin({
                            accId: email.toLowerCase(),
                            pwd: "google_oauth_auth"
                        });
                    }

                    var btnSubmit = cc.Sprite.create("image/ibg/btn_google.png");
                    btnSubmit.setScale(0.85);
                    btnSubmit.setPosition(cc.p(230, 105));
                    bg.addChild(btnSubmit);

                    var btnQuick = cc.Sprite.create("image/ibg/bt_login_comfirm.png");
                    btnQuick.setPosition(cc.p(130, 42));
                    bg.addChild(btnQuick);
                    var quickLabel = cc.LabelTTF.create("AKUN CEPAT", "Helvetica", 13, cc.size(130, 18), cc.TEXT_ALIGNMENT_CENTER);
                    quickLabel.setPosition(cc.p(btnQuick.getContentSize().width / 2, btnQuick.getContentSize().height / 2));
                    quickLabel.setColor(cc.c3b(255, 255, 255));
                    btnQuick.addChild(quickLabel);

                    var btnCancel = cc.Sprite.create("image/ibg/bt_login_comfirm.png");
                    btnCancel.setPosition(cc.p(330, 42));
                    bg.addChild(btnCancel);
                    var cancelLabel = cc.LabelTTF.create("BATAL", "Helvetica", 13, cc.size(130, 18), cc.TEXT_ALIGNMENT_CENTER);
                    cancelLabel.setPosition(cc.p(btnCancel.getContentSize().width / 2, btnCancel.getContentSize().height / 2));
                    cancelLabel.setColor(cc.c3b(255, 180, 180));
                    btnCancel.addChild(cancelLabel);

                    modalLayer.setTouchPriority(-1000);
                    modalLayer.registerScriptTouchHandler(function (eventType, touches) {
                        if (eventType === "began") {
                            return true;
                        } else if (eventType === "ended") {
                            var touch = touches[0];
                            var loc = touch.getLocation();
                            var pSub = btnSubmit.convertToNodeSpace(loc);
                            var sSub = btnSubmit.getContentSize();
                            if (pSub.x >= 0 && pSub.x <= sSub.width && pSub.y >= 0 && pSub.y <= sSub.height) {
                                var txt = editBox.getText();
                                return doGoogleLogin(txt || ("google_player_" + Math.floor(Math.random() * 89999 + 10000) + "@gmail.com"));
                            }
                            var pQ = btnQuick.convertToNodeSpace(loc);
                            var sQ = btnQuick.getContentSize();
                            if (pQ.x >= 0 && pQ.x <= sQ.width && pQ.y >= 0 && pQ.y <= sQ.height) {
                                return doGoogleLogin("google_shinobi_" + Math.floor(Math.random() * 89999 + 10000) + "@gmail.com");
                            }
                            var pC = btnCancel.convertToNodeSpace(loc);
                            var sC = btnCancel.getContentSize();
                            if (pC.x >= 0 && pC.x <= sC.width && pC.y >= 0 && pC.y <= sC.height) {
                                try { modalLayer.removeFromParent(); } catch (e) {}
                                self.__nhGoogleModal = null;
                                return true;
                            }
                            return true;
                        }
                    }, false, -1000, true);

                } catch (eGModal) {
                    say('loginGooglePlus modal error: ' + eGModal);
                    self.onPressLogin({
                        accId: "google_player_" + Math.floor(Math.random() * 89999 + 10000) + "@gmail.com",
                        pwd: "google_oauth_auth"
                    });
                }
            };

            // Guard showEntranceLayer & showEntranceLayerScheduleOnce
            if (LoginScene.prototype.showEntranceLayer) {
                var _origShowEntrance = LoginScene.prototype.showEntranceLayer;
                LoginScene.prototype.showEntranceLayer = function () {
                    say('Safe showEntranceLayer invoked.');
                    try {
                        var res = _origShowEntrance.apply(this, arguments);
                        if (typeof this.applyResponsiveLoginLayout === 'function') {
                            this.applyResponsiveLoginLayout();
                        }
                        return res;
                    } catch (eShowEnt) {
                        say('showEntranceLayer intercepted error: ' + eShowEnt);
                        if (this.EntranceLayer && typeof this.switchLayer === 'function') {
                            this.switchLayer(this.EntranceLayer);
                        }
                    }
                };
            }
            if (LoginScene.prototype.showEntranceLayerScheduleOnce) {
                var _origShowEntranceOnce = LoginScene.prototype.showEntranceLayerScheduleOnce;
                LoginScene.prototype.showEntranceLayerScheduleOnce = function () {
                    say('Safe showEntranceLayerScheduleOnce invoked.');
                    try {
                        var resOnce = _origShowEntranceOnce.apply(this, arguments);
                        if (typeof this.applyResponsiveLoginLayout === 'function') {
                            this.applyResponsiveLoginLayout();
                        }
                        return resOnce;
                    } catch (eShowEntOnce) {
                        say('showEntranceLayerScheduleOnce intercepted error: ' + eShowEntOnce);
                    }
                };
            }

            // Guard onTouchesEnded to handle Google, FastEntrance, EnterGame, Servers, SwitchAccount, and Back
            if (LoginScene.prototype.onTouchesEnded) {
                var _origTouchEnded = LoginScene.prototype.onTouchesEnded;
                LoginScene.prototype.onTouchesEnded = function (touches) {
                    try {
                        var target = this.lastTouchTarget || this.touchTarget;
                        var ty = (target && target._ty) ? target._ty : "";
                        var isChan = !!(this.currentLayer && (this.currentLayer === this.ChannelLayer || this.currentLayer === this.ChannelLayer_signup));
                        var isEnt = !!(this.currentLayer && this.currentLayer === this.EntranceLayer);
                        var isSrv = !!(this.currentLayer && this.currentLayer === this.ServerListLayer);
                        say('LoginScene onTouchesEnded ty=' + ty + ' isChan=' + isChan + ' isEnt=' + isEnt + ' isSrv=' + isSrv);

                        // 1. Switch Account (GANTI AKUN)
                        if (ty === "switchAccount") {
                            if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) {}
                            }
                            if (typeof accountUtil !== 'undefined' && accountUtil.saveAccount) {
                                try { accountUtil.saveAccount(null); } catch (eClear) {}
                            }
                            if (typeof this.switchLayer === 'function') {
                                this.switchLayer(this.RegButtonLayer || null);
                            }
                            return;
                        }

                        // 2. Enter Game (ENTER GAME)
                        if (ty === "enterGame") {
                            if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                try { AudioEngine.getInstance().playerEffectSound('japaneseknock'); } catch (e) {}
                            }
                            if (typeof this.onPressEnterGame === 'function') {
                                return this.onPressEnterGame();
                            }
                        }

                        // 3. Show Servers list
                        if (ty === "showServers") {
                            if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) {}
                            }
                            if (typeof this.showServerListLayer === 'function') {
                                return this.showServerListLayer();
                            } else if (typeof this.clickUpdateServerList === 'function') {
                                return this.clickUpdateServerList();
                            }
                        }

                        // 4. Back to Entrance
                        if (ty === "backToEntrance") {
                            if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) {}
                            }
                            if (typeof this.showEntranceLayer === 'function') {
                                return this.showEntranceLayer();
                            }
                        }

                        // 5. Open Login Dialog from welcome screen
                        if (!isChan && !isEnt && !isSrv) {
                            if (ty === "fastEntrance" || ty === "btn_login") {
                                if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                    try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) {}
                                }
                                if (typeof this.switloginchLayer === 'function') {
                                    return this.switloginchLayer();
                                } else if (typeof this.switchLayer === 'function') {
                                    return this.switchLayer(this.ChannelLayer || null);
                                }
                            }
                        }

                        // 6. Google Login button
                        if (ty === "loginGooglePlus") {
                            if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) {}
                            }
                            if (typeof this.loginGooglePlus === 'function') {
                                return this.loginGooglePlus();
                            }
                        } else if (ty === "fastEntrance") {
                            if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) {}
                            }
                            if (typeof this.switloginchLayer === 'function') {
                                return this.switloginchLayer();
                            } else if (typeof this.switchLayer === 'function') {
                                return this.switchLayer(this.ChannelLayer || null);
                            }
                        } else if (ty === "btn_signup" || ty === "toRegister") {
                            if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) {}
                            }
                            if (typeof this.signup_layer === 'function') {
                                this.signup_layer();
                                if (typeof this.applyResponsiveLoginLayout === 'function') {
                                    this.applyResponsiveLoginLayout();
                                }
                                return;
                            }
                        } else if (ty === "btn_back") {
                            if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) {}
                            }
                            if (this.currentLayer === this.ServerListLayer) {
                                if (typeof this.showEntranceLayer === 'function') {
                                    return this.showEntranceLayer();
                                }
                            } else if (this.currentLayer === this.ChannelLayer_signup) {
                                if (typeof this.switloginchLayer === 'function') {
                                    return this.switloginchLayer();
                                } else if (typeof this.switchLayer === 'function') {
                                    this.switchLayer(this.ChannelLayer || null);
                                    return;
                                }
                            } else if (typeof this.switchLayer === 'function') {
                                this.switchLayer(this.RegButtonLayer || null);
                                return;
                            }
                        }

                        return _origTouchEnded.apply(this, arguments);
                    } catch (eTouchEnd) {
                        say('LoginScene onTouchesEnded intercepted error: ' + eTouchEnd);
                    }
                };
            }
        }
    } catch (eLoginGuards) {
        say('Error installing LoginScene guards: ' + eLoginGuards);
    }

    // 8. Guard accountUtil.checkAccount
    try {
        if (typeof accountUtil !== 'undefined' && accountUtil) {
            var _origCheckAcc = accountUtil.checkAccount;
            accountUtil.checkAccount = function () {
                say('Safe checkAccount invoked.');
                try {
                    var acc = accountUtil.getAccount ? accountUtil.getAccount() : null;
                    var loginScene = (typeof httpUtil !== 'undefined' && httpUtil.getLoginScene) ? httpUtil.getLoginScene() : null;
                    if (loginScene) {
                        if (acc) {
                            if (typeof loginScene.showEntranceLayer === 'function') loginScene.showEntranceLayer();
                        } else {
                            if (typeof loginScene.switchLayer === 'function') {
                                loginScene.switchLayer(loginScene.RegButtonLayer || loginScene.ChannelLayer || null);
                            }
                        }
                    } else if (_origCheckAcc) {
                        return _origCheckAcc.apply(this, arguments);
                    }
                } catch (eChkAcc) {
                    say('checkAccount error caught: ' + eChkAcc);
                }
            };
        }
    } catch (eAcc) {}

    // 9. PromptView Loading Watchdog: prevent stuck loading screen
    try {
        if (typeof PromptView !== 'undefined' && PromptView && PromptView.setPageView && !PromptView.setPageView.__nhWatch) {
            var _origSetPageView = PromptView.setPageView;
            var _loadingTimer = null;
            PromptView.setPageView = function (viewName) {
                try {
                    if (_loadingTimer) {
                        clearTimeout(_loadingTimer);
                        _loadingTimer = null;
                    }
                    if (viewName === 'loading') {
                        _loadingTimer = setTimeout(function () {
                            try {
                                say('[PromptView Watchdog] Auto-dismissing stuck loading screen after timeout');
                                _origSetPageView.call(PromptView, null);
                            } catch (eDismiss) {}
                        }, 3500);
                    }
                } catch (eWatch) {}
                return _origSetPageView.apply(this, arguments);
            };
            PromptView.setPageView.__nhWatch = true;
            say('PromptView Loading Watchdog installed.');
        }
    } catch (ePvWatch) {}

    // 10. Guard ZhuangBeiScene: Fix Ninja vs Costume tab visibility, close button ('X'), and sync Ninja stats
    try {
        if (typeof ZhuangBeiScene !== 'undefined' && ZhuangBeiScene.prototype && !ZhuangBeiScene.prototype.__nhInitGuard) {
            ZhuangBeiScene.prototype.__nhInitGuard = true;

            // Enforce clean container visibility between tabs
            ZhuangBeiScene.prototype.applyTabVisibility = function (tab) {
                try {
                    var offX = 30000;
                    var onX = 184;
                    var y = 0;

                    if (tab === 4) {
                        // Far right Tab 4: Costume ONLY
                        if (this.costumeContainer) {
                            this.costumeContainer.setVisible(true);
                            this.costumeContainer.setPosition(cc.p(onX, (this.costumeContainer.getPositionY() || y)));
                        }
                        if (this.inforContainer) {
                            this.inforContainer.setVisible(false);
                            this.inforContainer.setPosition(cc.p(offX, y));
                        }
                        if (this.roleProps) this.roleProps.setVisible(false);
                        if (this.accContainer) {
                            this.accContainer.setVisible(false);
                            this.accContainer.setPosition(cc.p(offX, y));
                        }
                        if (this.mergeContainer) {
                            this.mergeContainer.setVisible(false);
                            this.mergeContainer.setPosition(cc.p(offX, y));
                        }
                        if (typeof this.updateCostumeInfo === 'function') {
                            try { this.updateCostumeInfo(); } catch (eCost) {}
                        }
                    } else {
                        // Any other tab: Hide costumeContainer completely
                        if (this.costumeContainer) {
                            this.costumeContainer.setVisible(false);
                            this.costumeContainer.setPosition(cc.p(offX, y));
                        }
                        if (tab === 0) {
                            // Tab 0: Ninja info & stats
                            if (this.inforContainer) {
                                this.inforContainer.setVisible(true);
                                this.inforContainer.setPosition(cc.p(onX, (this.inforContainer.getPositionY() || y)));
                            }
                            if (this.roleContainer) this.roleContainer.setVisible(true);
                            if (this.roleProps) this.roleProps.setVisible(true);
                            if (this.roleStopBox) this.roleStopBox.setVisible(true);
                            if (this.accContainer) {
                                this.accContainer.setVisible(false);
                                this.accContainer.setPosition(cc.p(offX, y));
                            }
                            if (this.mergeContainer) {
                                this.mergeContainer.setVisible(false);
                                this.mergeContainer.setPosition(cc.p(offX, y));
                            }
                        } else if (tab === 1) {
                            // Tab 1: Equipment
                            if (this.accContainer) {
                                this.accContainer.setVisible(true);
                                this.accContainer.setPosition(cc.p(278, (this.accContainer.getPositionY() || y)));
                            }
                        } else if (tab === 3) {
                            // Tab 3: Merge
                            if (this.mergeContainer) {
                                this.mergeContainer.setVisible(true);
                                this.mergeContainer.setPosition(cc.p(onX, (this.mergeContainer.getPositionY() || y)));
                            }
                        }
                    }
                } catch (eVis) {
                    say('applyTabVisibility error: ' + eVis);
                }
            };

            // Hook showBtn to apply clean tab separation
            if (typeof ZhuangBeiScene.prototype.showBtn === 'function') {
                var _origShowBtn = ZhuangBeiScene.prototype.showBtn;
                ZhuangBeiScene.prototype.showBtn = function (idx) {
                    var res = _origShowBtn.apply(this, arguments);
                    try {
                        var tab = (typeof idx === 'number') ? idx : (typeof this.showIdx === 'number' ? this.showIdx : 0);
                        this.applyTabVisibility(tab);
                    } catch (eSB) {}
                    return res;
                };
            }

            // Hook initUI to set default Ninja tab, sync stats, and initialize close button
            if (typeof ZhuangBeiScene.prototype.initUI === 'function') {
                var _origZBInitUI = ZhuangBeiScene.prototype.initUI;
                ZhuangBeiScene.prototype.initUI = function () {
                    var res = _origZBInitUI.apply(this, arguments);
                    try {
                        if (this.closeBtn) {
                            this.closeBtn._ty = 'close';
                        }
                        // Default to Ninja tab (0) and ensure Costume panel is hidden
                        if (typeof this.showBtn === 'function') {
                            this.showBtn(0);
                        } else if (typeof this.applyTabVisibility === 'function') {
                            this.applyTabVisibility(0);
                        }
                        var curK = this.currentKey || (typeof RoleData !== 'undefined' && RoleData.getInstance ? RoleData.getInstance().currentKey : null);
                        if (curK && typeof this.refreshNija === 'function') {
                            this.refreshNija(curK, null, false);
                        }
                    } catch (eZBFix) {
                        say('ZhuangBeiScene initUI hook error: ' + eZBFix);
                    }
                    return res;
                };
            }

            // Hook onTouchesEnded to reliably close ZhuangBeiScene when 'X' button is clicked
            if (typeof ZhuangBeiScene.prototype.onTouchesEnded === 'function') {
                var _origOnTouchesEnded = ZhuangBeiScene.prototype.onTouchesEnded;
                ZhuangBeiScene.prototype.onTouchesEnded = function (touches, event) {
                    try {
                        if (touches && touches.length > 0 && this.closeBtn && this.closeBtn.isVisible()) {
                            var pt = touches[0].getLocation();
                            var localPt = this.closeBtn.convertToNodeSpace(pt);
                            var btnSz = this.closeBtn.getContentSize();
                            var w = btnSz ? btnSz.width : 50;
                            var h = btnSz ? btnSz.height : 50;
                            // Generous hit area: +35px padding around close button
                            var isHitClose = (localPt.x >= -35 && localPt.x <= (w + 35) && localPt.y >= -35 && localPt.y <= (h + 35));
                            if (!isHitClose && this.lastTouchTarget && (this.lastTouchTarget === this.closeBtn || this.lastTouchTarget._ty === 'close')) {
                                isHitClose = true;
                            }

                            if (isHitClose) {
                                say('ZhuangBeiScene closeBtn clicked, closing scene...');
                                try {
                                    if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                        AudioEngine.getInstance().playerEffectSound('click');
                                    }
                                } catch (eAudio) {}
                                if (typeof ContentView !== 'undefined' && ContentView.setPageView) {
                                    ContentView.setPageView(null);
                                }
                                if (typeof this.onRemoveMe === 'function') {
                                    this.onRemoveMe();
                                }
                                return;
                            }
                        }
                    } catch (eClose) {
                        say('ZhuangBeiScene close hook error: ' + eClose);
                    }
                    return _origOnTouchesEnded.apply(this, arguments);
                };
            }

            say('ZhuangBeiScene guards (closeBtn + Ninja/Costume tabs) installed.');
        }
    } catch (eZBGuard) {
        say('ZhuangBeiScene guard error: ' + eZBGuard);
    }


    // 11. NH_AUDIO_GUARD: Pastikan AudioEngine Cocos2d-x unmuted, volume aktif, dan BGM/SFX berbunyi
    try {
        var fixAudioEngine = function () {
            try {
                if (typeof AudioEngine === 'undefined' || !AudioEngine.getInstance) return;
                var ae = AudioEngine.getInstance();
                if (!ae) return;

                // Pastikan native audioEngine volume aktif
                if (ae.audioEngine) {
                    if (typeof ae.audioEngine.setMusicVolume === 'function') {
                        var mv = typeof ae.audioEngine.getMusicVolume === 'function' ? ae.audioEngine.getMusicVolume() : 1.0;
                        if (mv <= 0) ae.audioEngine.setMusicVolume(0.8);
                    }
                    if (typeof ae.audioEngine.setEffectsVolume === 'function') {
                        var ev = typeof ae.audioEngine.getEffectsVolume === 'function' ? ae.audioEngine.getEffectsVolume() : 1.0;
                        if (ev <= 0) ae.audioEngine.setEffectsVolume(0.8);
                    }
                }

                // Jika storeData tersimpan muted (noBgSound: true), reset ke unmuted
                if (ae.storeData) {
                    if (ae.storeData.noBgSound || ae.storeData.noEffectSound) {
                        say('AudioEngine tersimpan dalam kondisi muted, mereset status audio...');
                        ae.sendBgSound(false);
                    }
                }

                // Jika BGM belum berbunyi di scene aktif, panggil maiSound
                if (ae.audioEngine && typeof ae.audioEngine.isMusicPlaying === 'function') {
                    if (!ae.audioEngine.isMusicPlaying() && !ae.getBgSound()) {
                        var curPage = ae.currentPage || 'homeSound0';
                        if (typeof ae.maiSound === 'function') {
                            ae.maiSound(curPage);
                        } else if (typeof ae.playerBgSound === 'function') {
                            ae.playerBgSound(curPage);
                        }
                    }
                }
            } catch (eFix) {
                say('fixAudioEngine error: ' + eFix);
            }
        };

        // Hook AudioEngine.prototype.playerBgSound agar tidak terhalang duplicate cache jika belum playing
        if (typeof AudioEngine !== 'undefined' && AudioEngine.prototype) {
            var _origPlayerBg = AudioEngine.prototype.playerBgSound;
            if (_origPlayerBg && !_origPlayerBg.__nhWrapped) {
                AudioEngine.prototype.playerBgSound = function (name) {
                    try {
                        if (this.audioEngine && typeof this.audioEngine.isMusicPlaying === 'function') {
                            if (!this.audioEngine.isMusicPlaying()) {
                                this.bgSound_name = null;
                            }
                        }
                    } catch (e) {}
                    return _origPlayerBg.apply(this, arguments);
                };
                AudioEngine.prototype.playerBgSound.__nhWrapped = true;
            }
        }

        // Jalankan fix audio segera dan berkala saat inisialisasi awal
        fixAudioEngine();
        if (typeof setInterval === 'function') {
            var audioAttempts = 0;
            var audioTimer = setInterval(function () {
                audioAttempts++;
                fixAudioEngine();
                if (audioAttempts > 15) {
                    clearInterval(audioTimer);
                }
            }, 1000);
        }
        say('NH_AUDIO_GUARD installed successfully.');
    } catch (eAudioGuard) {
        say('NH_AUDIO_GUARD error: ' + eAudioGuard);
    }

    // === NH_NODE_ADDCHILD_GUARD ===
    try {
        if (typeof cc !== 'undefined' && cc.Node && cc.Node.prototype && !cc.Node.prototype.__nhSafeChild) {
            var _origNodeAddChild = cc.Node.prototype.addChild;
            cc.Node.prototype.addChild = function (child) {
                if (!child) {
                    return;
                }
                return _origNodeAddChild.apply(this, arguments);
            };
            cc.Node.prototype.addChild.__nhSafeChild = true;
            say('NH_NODE_ADDCHILD_GUARD installed.');
        }
    } catch (eAddChildGuard) {
        say('NH_NODE_ADDCHILD_GUARD error: ' + eAddChildGuard);
    }

    // === NH_BUZHEN_GUARD (Combat Formation Lineup & Combat Power Display) ===
    try {
        // 1. Guard BuZhenRole
        if (typeof BuZhenRole !== 'undefined' && BuZhenRole.prototype && !BuZhenRole.prototype.__nhGuarded) {
            var _origBuZhenRoleBuildUI = BuZhenRole.prototype.buildUI;
            BuZhenRole.prototype.buildUI = function (idx, b) {
                try {
                    this.idx = idx;
                    // Transparent base stone
                    try {
                        var bgTouming = GameTools.getInstance().getSpritePlist("image/ibg/touming.png");
                        if (bgTouming) {
                            this.addChild(bgTouming);
                            bgTouming.setAnchorPoint(cc.p(0.5, 0));
                            bgTouming.setPositionY(-6);
                        }
                    } catch (eBg) {}

                    // Role box container
                    if (!this.roleBox && typeof RoleStopBox !== 'undefined') {
                        this.roleBox = new RoleStopBox();
                        this.addChild(this.roleBox);
                        if (typeof this.roleBox.buildUI === 'function') {
                            this.roleBox.buildUI(-1, 0.68);
                        } else {
                            this.roleBox.fx = -1;
                            this.roleBox.scl = 0.68;
                        }
                        this.roleBox.setScaleX(-0.68);
                        this.roleBox.setScaleY(0.68);
                        this.roleBox.setPositionY(28);
                    }

                    // Order badge (1haowei, 2haowei, 3haowei)
                    try {
                        var badgePath = "image/ichuzhan/" + (idx + 1) + "haowei.png";
                        var badge = GameTools.getInstance().getSpritePlist(badgePath);
                        if (badge) {
                            this.addChild(badge);
                            badge.setPositionY(22);
                        } else {
                            var numLabel = cc.LabelTTF.create(String(idx + 1), "Helvetica", 16);
                            if (numLabel) {
                                numLabel.setColor(cc.c3b(255, 215, 0));
                                numLabel.setPosition(cc.p(0, 22));
                                this.addChild(numLabel);
                            }
                        }
                    } catch (eBadge) {}
                } catch (eBuildUI) {
                    say('BuZhenRole.buildUI error: ' + eBuildUI);
                }
            };

            var _origBuZhenRoleUpdata = BuZhenRole.prototype.updata;
            BuZhenRole.prototype.updata = function (heroKey, roleDataInst) {
                try {
                    this.key = heroKey;
                    var rd = roleDataInst || (typeof RoleData !== 'undefined' && RoleData.getInstance ? RoleData.getInstance() : null);
                    if (!rd) return;

                    var rid = (heroKey && rd.getRoleID) ? rd.getRoleID(heroKey) : null;
                    var cid = (heroKey && rd.getCostumeID) ? rd.getCostumeID(heroKey) : null;
                    var qlv = (heroKey && rd.getQlv) ? rd.getQlv(heroKey) : 0;

                    say('BuZhenRole updata idx=' + this.idx + ' heroKey=' + heroKey + ' rid=' + rid + ' cid=' + cid + ' qlv=' + qlv);
                    if (this.roleBox) {
                        if (rid && Number(rid) > 0) {
                            this.roleBox.setVisible(true);
                            this.roleBox.fx = -1;
                            this.roleBox.scl = 0.68;
                            this.roleBox.setScaleX(-0.68);
                            this.roleBox.setScaleY(0.68);
                            this.roleBox.setPositionY(28);
                            if (typeof this.roleBox.updata === 'function') {
                                this.roleBox.updata(rid, null, cid, qlv);
                            }
                            if (this.roleBox.img) {
                                this.roleBox.img.setScaleX(-Math.abs(this.roleBox.img.getScaleX() || 0.68));
                            }
                            if (this.roleBox.roleArmature) {
                                this.roleBox.roleArmature.setScaleX(-Math.abs(this.roleBox.roleArmature.getScaleX() || 0.68));
                            }
                        } else {
                            this.roleBox.setVisible(false);
                            try { this.roleBox.removeAllChildren(true); } catch (eRemAll) {}
                        }
                    }

                    // Keep "Choose Ninja" button always visible so user can change/swap ninja
                    try {
                        var scene = (typeof MainView !== 'undefined' && MainView.currentPage) ? MainView.currentPage : null;
                        if (scene && scene["xuanzheBtn" + this.idx]) {
                            var btn = scene["xuanzheBtn" + this.idx];
                            if (btn && typeof btn.setVisible === 'function') {
                                btn.setVisible(true);
                            }
                        }
                    } catch (eBtn) {}
                } catch (eUp) {
                    say('BuZhenRole.updata error: ' + eUp);
                }
            };

            BuZhenRole.prototype.__nhGuarded = true;
            say('BuZhenRole guards installed.');
        }

        // 2. Enforce Unique Ninja in Lineup (mars) and Deploy Board (aids)
        if (typeof RoleData !== 'undefined' && RoleData.prototype && !RoleData.prototype.__nhUniqueHeroGuarded) {
            var _origSetMars = RoleData.prototype.set_Mars;
            RoleData.prototype.set_Mars = function (heroKey, targetIdx) {
                try {
                    if (heroKey && Number(heroKey) > 0 && typeof this.getRoleID === 'function') {
                        var targetRoleId = this.getRoleID(heroKey);
                        if (targetRoleId) {
                            // 1. Prevent duplicate role in mars (combat slots)
                            if (this.mars && this.mars.length) {
                                for (var i = 0; i < this.mars.length; i++) {
                                    if (i !== targetIdx && this.mars[i] && this.getRoleID(this.mars[i]) === targetRoleId) {
                                        say('set_Mars: removing duplicate role ' + targetRoleId + ' from mars slot ' + i);
                                        this.mars[i] = 0;
                                    }
                                }
                            }
                            // 2. Prevent duplicate role between mars and aids
                            if (this.aids && this.aids.length) {
                                for (var j = 0; j < this.aids.length; j++) {
                                    if (this.aids[j] && this.getRoleID(this.aids[j]) === targetRoleId) {
                                        say('set_Mars: removing duplicate role ' + targetRoleId + ' from aids slot ' + j);
                                        this.aids[j] = 0;
                                    }
                                }
                            }
                        }
                    }
                } catch (eSetMars) {
                    say('set_Mars guard error: ' + eSetMars);
                }
                return _origSetMars.apply(this, arguments);
            };

            var _origSetAids = RoleData.prototype.set_Aids;
            RoleData.prototype.set_Aids = function (heroKey, targetIdx) {
                try {
                    if (heroKey && Number(heroKey) > 0 && typeof this.getRoleID === 'function') {
                        var targetRoleId = this.getRoleID(heroKey);
                        if (targetRoleId) {
                            // 1. Prevent duplicate role in aids (deploy slots)
                            if (this.aids && this.aids.length) {
                                for (var j = 0; j < this.aids.length; j++) {
                                    if (j !== targetIdx && this.aids[j] && this.getRoleID(this.aids[j]) === targetRoleId) {
                                        say('set_Aids: removing duplicate role ' + targetRoleId + ' from aids slot ' + j);
                                        this.aids[j] = 0;
                                    }
                                }
                            }
                            // 2. Prevent duplicate role between aids and mars
                            if (this.mars && this.mars.length) {
                                for (var i = 0; i < this.mars.length; i++) {
                                    if (this.mars[i] && this.getRoleID(this.mars[i]) === targetRoleId) {
                                        say('set_Aids: removing duplicate role ' + targetRoleId + ' from mars slot ' + i);
                                        this.mars[i] = 0;
                                    }
                                }
                            }
                        }
                    }
                } catch (eSetAids) {
                    say('set_Aids guard error: ' + eSetAids);
                }
                return _origSetAids.apply(this, arguments);
            };

            RoleData.prototype.__nhUniqueHeroGuarded = true;
            say('RoleData unique hero guards (set_Mars & set_Aids) installed.');
        }

        // 3. Guard BuZhenScene (Lineup synchronization and Combat Power rendering)
        if (typeof BuZhenScene !== 'undefined' && BuZhenScene.prototype && !BuZhenScene.prototype.__nhGuarded) {
            BuZhenScene.prototype.updatePower = function () {
                try {
                    var totalPower = 0;
                    var rd = typeof RoleData !== 'undefined' && RoleData.getInstance ? RoleData.getInstance() : null;
                    if (rd) {
                        if (typeof rd.getAllPower === 'function') {
                            try { totalPower = Number(rd.getAllPower() || 0); } catch (eAllP) {}
                        }
                        // Fallback calculate if 0
                        if (!totalPower && rd.mars && rd.heros) {
                            for (var i = 0; i < rd.mars.length; i++) {
                                var k = rd.mars[i];
                                if (k && rd.heros[k]) {
                                    var h = rd.heros[k];
                                    var p = Number(h.power || 0);
                                    if (!p) {
                                        var hp = Number(h.hp || 0);
                                        var att = Number(h.att || 0);
                                        var def = Number(h.def || 0);
                                        var agi = Number(h.agi || 0);
                                        p = Math.floor(att * 2.5 + def * 2.0 + hp * 0.6 + agi * 1.5);
                                    }
                                    totalPower += p;
                                }
                            }
                        }
                    }
                    say('BuZhenScene.updatePower calculated: ' + totalPower);

                    // Remove previous power visual
                    if (this.powerImg) {
                        try { this.powerImg.removeFromParent(); } catch (eRem) {}
                        this.powerImg = null;
                    }
                    if (this.__nhPowerLabel) {
                        try { this.__nhPowerLabel.removeFromParent(); } catch (eRemLbl) {}
                        this.__nhPowerLabel = null;
                    }

                    var renderedWithNumberBox = false;
                    try {
                        if (typeof NumberBox !== 'undefined' && this.powerBg) {
                            this.powerImg = new NumberBox();
                            this.powerImg.updata(totalPower, "v", true);
                            this.powerBg.addChild(this.powerImg);
                            var bgSize = this.powerBg.getContentSize();
                            this.powerImg.setPosition(cc.p(bgSize.width / 2 + 35, bgSize.height / 2));
                            if (this.powerImg.getChildrenCount && this.powerImg.getChildrenCount() > 0) {
                                renderedWithNumberBox = true;
                            }
                        }
                    } catch (eNb) {
                        say('NumberBox updatePower error: ' + eNb);
                    }

                    // High-res styled label fallback if NumberBox has no sprite frames
                    if (!renderedWithNumberBox && this.powerBg) {
                        var fmtPower = (typeof totalPower.toLocaleString === 'function') ? totalPower.toLocaleString() : String(totalPower);
                        var pLbl = cc.LabelTTF.create(fmtPower, "Helvetica", 22);
                        if (pLbl) {
                            pLbl.setColor(cc.c3b(255, 220, 60));
                            var bgSize = this.powerBg.getContentSize();
                            pLbl.setPosition(cc.p(bgSize.width / 2 + 25, bgSize.height / 2));
                            this.powerBg.addChild(pLbl);
                            this.__nhPowerLabel = pLbl;
                        }
                    }
                } catch (ePowerTotal) {
                    say('BuZhenScene.updatePower error: ' + ePowerTotal);
                }
            };

            var _origBuZhenSceneInitUI = BuZhenScene.prototype.initUI;
            BuZhenScene.prototype.initUI = function (data) {
                try {
                    _origBuZhenSceneInitUI.apply(this, arguments);
                } catch (eInit) {
                    say('BuZhenScene.initUI internal handled: ' + eInit);
                    try {
                        if (typeof this.createMenu === 'function') this.createMenu();
                        if (typeof this.createSelectRole === 'function') this.createSelectRole();
                        if (typeof this.onChangeRoleData === 'function') this.onChangeRoleData(null);
                        this.updatePower();
                    } catch (eFallback) {}
                }
            };

            BuZhenScene.prototype.__nhGuarded = true;
            say('BuZhenScene guards installed.');
        }
    } catch (eBuZhenGuard) {
        say('NH_BUZHEN_GUARD error: ' + eBuZhenGuard);
    }

        say('Safety Guards installed successfully.');
})();
// ==================================================================================
"use strict";
function __NH_INSTALL_COMBAT_FIXES() {
    var trialSendingScene = null, trialPending = null;
    var tutorialResult = null;
    function refreshTutorialResult() {
        var pending = tutorialResult;
        if (!pending || pending.scene.__nhTutorialResultDisposed || typeof AdventureData === 'undefined' || typeof RoleData === 'undefined')
            return;
        var game = GameData.getInstance(), roles = RoleData.getInstance(), chapters = AdventureData.getInstance().adv || [];
        if (game.sockentType !== 'combatTiro' || Number(game.sockentData) !== pending.stage + 1)
            return;
        var hero = roles.heros && roles.heros[pending.hid], clears = chapters[0] || [];
        //886 builds the local tutorial replay before its asynchronous stage ACK.
        //Only the matching authoritative clear AND owned hero can settle the row.
        //Do not infer a level-up from the script's quoted reward or edit that replay.
        if (Number(roles.tiroRoleKey) !== pending.hid || clears.indexOf(pending.stage) < 0 || !hero ||
            Number(hero.id) !== pending.roleId || Number(hero.lv) < pending.stage || !isFinite(Number(hero.rxp)))
            return;
        var level = Number(hero.lv), stored = Math.max(0, Number(hero.rxp)), next = Config.getInstance().levelList[level], labels = pending.labels;
        labels.lvTF.setString(String(level));
        labels.uplv_icon.setVisible(level > pending.beforeLevel || pending.levelUp === true && level === pending.beforeLevel);
        if (level >= 150) {
            labels.expTF.setString('MAX');
            labels.expMC.setScaleX(1);
        }
        else if (next && Number(next.rxp) > 0) {
            labels.expTF.setString(stored + ' / ' + Number(next.rxp));
            labels.expMC.setScaleX(Math.min(1, stored / Number(next.rxp)));
        }
        tutorialResult = null; //Freeze this settlement; later hero changes belong to later actions.
    }
    function recoverTrial(uncertain) {
        var action = trialPending;
        trialPending = null;
        if (!action)
            return;
        action.scene.__nhTrialPending = false;
        if (action.scene.__nhTrialDisposed)
            return;
        // A rejected/non-handed-off request has no result left to wait for. A
        // transport outage is ambiguous: retain the original one-shot listener
        // for a late committed reply, until the scene's normal teardown removes it.
        if (!uncertain)
            OperResultData.getInstance().removeEventListener(EventType.EVENT_CHANGE, action.scene, 'onChangeOperResult');
        action.scene.__nhRestoreTrial();
    }
    function dispatchTrial(scene, callback, args) {
        if (trialPending || scene.__nhTrialDisposed)
            return;
        var previous = trialSendingScene;
        trialSendingScene = scene;
        try {
            return callback.apply(scene, args);
        }
        finally {
            trialSendingScene = previous;
        }
    }
    if (typeof GameConnection !== 'undefined' && typeof GameConnection.send === 'function' && !GameConnection.__nhTrialTransport) {
        var sendTrial = GameConnection.send;
        GameConnection.send = function (command) {
            var entry = command === 'doExamOption' || command === 'doNewExamOption';
            if (!trialSendingScene || (!entry && command !== 'quickExam' && command !== 'quickNewExam'))
                return sendTrial.apply(this, arguments);
            if (trialPending)
                return;
            var action = { scene: trialSendingScene, command: command, resultKind: entry ? 18 : 5 }, session = this.session, send = session && session.send, handedOff = false;
            trialPending = action;
            action.scene.__nhTrialPending = true;
            if (entry)
                action.scene.__nhTrialEntryAction = action;
            //3659/2713 originally register the entry listener only at first open.
            //A rejected attempt removes it; a deliberate retry must subscribe again.
            OperResultData.getInstance().addEventListener(EventType.EVENT_CHANGE, action.scene, 'onChangeOperResult');
            var observe = function (event) {
                var result = send.apply(this, arguments);
                if (event && event.source && Object.prototype.hasOwnProperty.call(event.source, command))
                    handedOff = true;
                return result;
            };
            if (typeof send === 'function')
                session.send = observe;
            try {
                return sendTrial.apply(this, arguments);
            }
            finally {
                if (session && session.send === observe)
                    session.send = send;
                // Recovered341 returns undefined both after a real handoff and on
                // no-session/throwing-send paths; its return value is not an ACK.
                if (!handedOff && trialPending === action)
                    recoverTrial(false);
            }
        };
        GameConnection.__nhRecoverTrialPending = function () { recoverTrial(false); };
        for (var ti = 0, trialLife = ['onclose', 'onerror', 'sessionClose', 'reconnect', 'login']; ti < trialLife.length; ti++)
            (function (name) {
                var original = GameConnection[name];
                if (typeof original === 'function')
                    GameConnection[name] = function () {
                        recoverTrial(true);
                        tutorialResult = null;
                        return original.apply(this, arguments);
                    };
            })(trialLife[ti]);
        GameConnection.__nhTrialTransport = true;
    }
    if (typeof GameConnection !== 'undefined' && typeof GameConnection.handleGameCommand === 'function' && !GameConnection.__nhTrialExperience) {
        var dispatch = GameConnection.handleGameCommand;
        GameConnection.handleGameCommand = function (key, value) {
            var result = dispatch.apply(this, arguments);
            //The actual345 dispatcher buffers unstable-network packets. Running
            //after its model reducer handles both ACK-before-panel and late ACK,
            //including the original packet order heros then adventure.
            if (key === 'heros' || key === 'adventure')
                refreshTutorialResult();
            // Both trial exit callbacks2736/3682 navigate away before the reply.
            // Use the actual dispatcher (after345's unstable-network buffer), not
            // an already-disposed scene listener or the old uniform reward quote.
            var kind = value && Number(value.type), gains = value && (kind === 9 ? value.param && value.param.heroRxp : kind === 7 ? value.heroRxp : null);
            if (key === 'operResult' && value && Number(value.res) === 0 && gains) {
                var total = 0, recipients = 0, count = 0, label = kind === 7 ? 'Adventure' : 'Trial';
                for (var hid in gains)
                    if (Object.prototype.hasOwnProperty.call(gains, hid)) {
                        var gain = Number(gains[hid]);
                        if (isFinite(gain) && gain >= 0) {
                            total += gain;
                            count++;
                            if (gain > 0)
                                recipients++;
                        }
                    }
                if (count)
                    PromptBox.getInstance().updataTxt(total > 0
                        ? label + ' EXP: ' + total + ' total across ' + recipients + (recipients === 1 ? ' ninja.' : ' ninjas.')
                        : label + ' complete. No EXP gained.');
            }
            return result;
        };
        GameConnection.__nhTrialExperience = true;
    }
    if (typeof GameOverScene !== 'undefined' && GameOverScene.prototype && !GameOverScene.prototype.__nhExperienceRows) {
        var resultRows = GameOverScene.prototype.buildUI;
        GameOverScene.prototype.buildUI = function (fighters, reward) {
            var before = this.getChildren().slice(0), result = resultRows.apply(this, arguments), children = this.getChildren(), index = 0;
            var kind = typeof GameData !== 'undefined' ? GameData.getInstance().sockentType : '';
            this.__nhTutorialResultDisposed = false;
            for (var i = 0; i < children.length; i++) {
                var node = children[i], labels = node.controller;
                if (before.indexOf(node) >= 0 || !labels || !labels.lvTF || !labels.xpTF || !labels.expTF || !labels.expMC)
                    continue;
                var fighter = fighters[index], support = (kind === 'recFight' || kind === 'newRecFight') && index > 0;
                index++;
                if (!fighter)
                    continue;
                if (index === 1 && fighters.length === 1 && kind === 'combatTiro' && typeof RoleData !== 'undefined') {
                    var tutorialStage = Number(GameData.getInstance().sockentData) - 1, roles = RoleData.getInstance(), hid = Number(roles.tiroRoleKey);
                    if (tutorialStage >= 1 && tutorialStage <= 3 && Math.floor(tutorialStage) === tutorialStage && hid > 0)
                        tutorialResult = { scene: this, labels: labels, stage: tutorialStage, hid: hid,
                            roleId: Number(fighter.id), beforeLevel: Number(fighter.lv) || 1, levelUp: fighter.lvUp === true };
                }
                if (support) {
                    // Both Halls lend NPC helpers. Only the owned first ninja earns EXP.
                    labels.xpTF.setVisible(false);
                    labels.expTF.setVisible(false);
                    labels.expMC.setScaleX(1);
                    continue;
                }
                var level = Math.max(1, Number(fighter.lv) || 1), capped = level >= 150;
                var gain = typeof fighter.xpGain === 'number' ? fighter.xpGain : capped ? 0 : Number(reward && reward.rxp) || 0;
                labels.xpTF.setVisible(isFinite(gain) && gain > 0);
                if (isFinite(gain) && gain > 0) {
                    labels.xpTF.setString('+' + gain + ' EXP');
                    // CCB has lvTF x202 and xpTF x235 on y30: three-digit levels cover
                    // the plus sign. Use the free line below the280px meter, within the
                    // original90px row spacing; preserve the level and name nodes.
                    labels.xpTF.setAnchorPoint(cc.p(1, 0.5));
                    labels.xpTF.setPosition(cc.p(283, -26));
                }
                labels.expTF.setVisible(true);
                if (capped) {
                    labels.expTF.setString('MAX');
                    labels.expMC.setScaleX(1);
                }
                else {
                    // Actual1080 prints only a numerator when stored EXP is positive.
                    var next = Config.getInstance().levelList[level], threshold = next && Number(next.rxp), stored = Math.max(0, Number(fighter.exp) || 0);
                    if (isFinite(threshold) && threshold > 0) {
                        labels.expTF.setString(stored + ' / ' + threshold);
                        labels.expMC.setScaleX(Math.min(1, stored / threshold));
                    }
                }
            }
            refreshTutorialResult();
            return result;
        };
        var removeResult = GameOverScene.prototype.onRemoveMe;
        if (typeof removeResult === 'function')
            GameOverScene.prototype.onRemoveMe = function () {
                this.__nhTutorialResultDisposed = true;
                if (tutorialResult && tutorialResult.scene === this)
                    tutorialResult = null;
                return removeResult.apply(this, arguments);
            };
        GameOverScene.prototype.__nhExperienceRows = true;
    }
    if (typeof ArmatureContainer !== 'undefined' && !ArmatureContainer.prototype.__nhFiniteReplay) {
        var replay = ArmatureContainer.prototype.updata;
        ArmatureContainer.prototype.updata = function (event) {
            if (event && (event.when === 0 || event.when === 2 || event.when === 7 || event.when === 9)) {
                // Older persisted request replies omit zero HP. Recovered1086 parses
                // these fields at animation frames, including frames of non-damage skills.
                var safe = {}, key;
                for (key in event)
                    if (Object.prototype.hasOwnProperty.call(event, key))
                        safe[key] = event[key];
                if (typeof safe.ahp !== 'number' || !isFinite(safe.ahp))
                    safe.ahp = 0;
                if (typeof safe.bhp !== 'number' || !isFinite(safe.bhp))
                    safe.bhp = 0;
                event = safe;
            }
            return replay.call(this, event);
        };
        ArmatureContainer.prototype.__nhFiniteReplay = true;
    }
    function installTrial(Scene, Data) {
        if (!Scene || !Scene.prototype || Scene.prototype.__nhTrialReplay)
            return;
        var proto = Scene.prototype;
        var build = proto.onChangeBuildData, receive = proto.onChangeOperResult;
        var records = proto.showRecords, inner = proto.neikuangVisible;
        var remove = proto.onRemoveMe, quick = proto.onTipQuickExam, maximum = proto.isMaxPass, enter = proto.enter, touch = proto.onTouchesEnded;
        function data() { return Data.getInstance(); }
        function closed() { return data().failed === true || Number(data().currPass) >= 150; }
        function syncControls(scene) {
            if (!closed())
                return;
            scene.xyc.setVisible(false);
            scene.kszd.setVisible(false);
            // Hidden CCB buttons still participate in the old touch list.
            if (scene.toucheList)
                scene.toucheList = scene.toucheList.filter(function (node) {
                    return node && node._ty !== 'xyc' && node._ty !== 'kszd';
                });
        }
        function position(scene, floor) {
            var odd = Math.max(0, floor) % 2, height = Number(scene.zzH), count = Number(scene.leng);
            scene.__nhTrialVisualFloor = Math.max(0, floor);
            scene.roleBox.stopAllActions();
            // Same two endpoints and fixed standing height computed by3659/2713.
            scene.roleBox.setPositionX(odd ? scene.rolePosX1 : scene.rolePosX0);
            scene.roleBox.setPositionY(scene.rolePosY + 28);
            scene.roleBox.setScaleX((odd ? -1 : 1) * scene.__nhTrialFacing);
            scene.roleBox.gotoPlay(armatureStand);
            // Rebase the finite recycled staircase. Row parity follows the floor,
            // avoiding the old moveScene overlap and unbounded cumulative MoveBy.
            for (var i = 0; i < count; i++) {
                var slot = (i - odd + count) % count, row = scene['c' + i];
                row.stopAllActions();
                row.setPositionY(scene.rolePosY + (slot - 1) * height);
                scene.addLevelTF(i, floor + slot - 1);
            }
        }
        function finish(scene) {
            scene.__nhTrialRecords = null;
            position(scene, Number(data().currPass));
            var summary = scene.examRecordLabel.list.length > 0;
            //3664/2718 re-show jinru0 along with the outer controls. Apply that
            // first, then3663/2717 hides Enter and installs the active touch list.
            // Reversing these calls leaves Enter ahead of Next/Fast in hit testing.
            scene.setWaikuangVisible(true);
            scene.neikuangVisible(1);
            if (summary)
                scene.setWaikuangVisible(false);
            if (summary && scene.recordTouchs)
                for (var i = 0; i < scene.recordTouchs.length; i++)
                    scene.recordTouchs[i].setVisible(true);
            // ExamData's change event runs before the buildings delta. By op18/5
            // the full response is applied, so the remaining-entry label is current.
            scene.setLeftNum();
            syncControls(scene);
        }
        proto.onChangeBuildData = function () {
            this.__nhTrialDisposed = false;
            var result = build.apply(this, arguments), floor = Number(data().currPass);
            this.__nhTrialVisualFloor = Math.max(0, floor);
            // RoleStopBox.buildUI mirrors the inner armature for odd floors; retain
            // that initial mirror when setting the outer node's facing direction.
            this.__nhTrialFacing = (floor >= 0 && floor % 2 ? -1 : 1) * (this.roleBox.getScaleX() || 1);
            if (floor >= 0)
                position(this, floor);
            syncControls(this);
            return result;
        };
        proto.__nhRestoreTrial = function () {
            this.__nhTrialRecords = null;
            this.rootNode.unschedule(this.testSch);
            this.__nhTrialFacing = this.__nhTrialFacing || 1;
            position(this, Number(data().currPass));
            this.setRecordVisible(false);
            this.setWaikuangVisible(true);
            this.neikuangVisible(Number(data().currPass) >= 0 ? 1 : 0);
            this.setLeftNum();
            this.setEnabledAll(true);
            // Restore presentation only. No floor, wallet, reward, timer or nonce is
            // edited, and no request is automatically sent again.
            if (PromptView.page === 'loading')
                PromptView.setPageView(null);
        };
        proto.onTouchesEnded = function () { return dispatchTrial(this, touch, arguments); };
        proto.neikuangVisible = function () {
            //An old op18/5 receipt can arrive after its run was collected. Both the
            //receipt completion and original summary-confirm callbacks request the
            //active controls; current server state must keep Enter instead in that
            //case. Historical result rows stay visible without reviving a run.
            var args = arguments;
            var result = Number(data().currPass) < 0 && args[0] === 1 ? inner.call(this, 0) : inner.apply(this, args);
            syncControls(this);
            return result;
        };
        proto.isMaxPass = function () {
            if (closed()) {
                PromptBox.getInstance().updataTxt('Trial finished. Collect your rewards to start a new run.');
                return true;
            }
            return maximum.apply(this, arguments);
        };
        proto.onTipQuickExam = function () {
            // A confirmation opened before settlement cannot spend on an inactive run.
            if (Number(data().currPass) < 0)
                return;
            if (closed())
                return this.isMaxPass();
            return dispatchTrial(this, quick, arguments);
        };
        proto.enter = function () {
            if (trialPending || this.__nhTrialDisposed)
                return false;
            this.__nhTrialEntryAction = null;
            var previous = data().currPass, accepted = dispatchTrial(this, enter, arguments), action = this.__nhTrialEntryAction;
            this.__nhTrialEntryAction = null;
            if (!accepted)
                return accepted;
            // The original click handler starts a walk as soon as enter returns true.
            // Wait for op18 instead; otherwise its action races the confirmed result.
            data().currPass = previous;
            //3681/2735 hide the outer controls AFTER send341, including when349
            //reports no session or341 swallows a send exception. Recover after those
            //optimistic statements too, and retain the original reconnect tip.
            if (action && trialPending === action)
                PromptView.setPageView('loading');
            else if (!this.__nhTrialDisposed)
                this.__nhRestoreTrial();
            return false;
        };
        proto.onChangeOperResult = function () {
            if (this.__nhTrialDisposed)
                return;
            var op = OperResultData.getInstance(), kind = Number(op.type);
            if (kind !== 18 && kind !== 5)
                return receive.apply(this, arguments);
            if (!Array.isArray(op.param))
                return receive.apply(this, arguments);
            //Both modes share OperResultData. An unrelated old quick/start receipt
            //must not release the other pending action or dismiss its spinner.
            if (trialPending && trialPending.scene === this) {
                if (kind !== trialPending.resultKind)
                    return;
                trialPending = null;
                this.__nhTrialPending = false;
            }
            PromptView.setPageView(null);
            OperResultData.getInstance().removeEventListener(EventType.EVENT_CHANGE, this, 'onChangeOperResult');
            this.rootNode.unschedule(this.testSch);
            this.__nhTrialFacing = this.__nhTrialFacing || 1;
            this.dataList = op.param.slice(0);
            this.examRecordLabel.list = [];
            this.rdx = 0;
            if (kind === 18) {
                // Start/paid skip acknowledges server-confirmed floors. It is not a
                // quick-fight request and must never launch the undefined-stage fly loop.
                this.examRecordLabel.list = this.dataList.slice(0);
                this.examRecordLabel.refresh();
                this.setRecordVisible(this.dataList.length > 0);
                finish(this);
                return;
            }
            this.__nhTrialRecords = this.dataList.slice(0);
            position(this, Math.max(0, Number(this.tmpPass) || 0));
            this.setRecordVisible(true);
            this.setWaikuangVisible(false);
            if (this.showRecords())
                this.gotoStart(3, 1);
        };
        proto.showRecords = function () {
            if (!this.__nhTrialRecords)
                return records.apply(this, arguments);
            var row = this.__nhTrialRecords[this.rdx];
            if (!row) {
                finish(this);
                return false;
            }
            this.examRecordLabel.list.push(row);
            this.examRecordLabel.refresh();
            this.rdx++;
            // A one-field row is an actual defeat. Never append an invented extra
            // defeat after the server's final record or animate a failed floor.
            if (row.length < 2) {
                finish(this);
                return false;
            }
            return true;
        };
        proto.gotoStart = function (kind, seconds) {
            if (kind === 1 && closed())
                return this.isMaxPass();
            var scene = this, floor = Number(this.__nhTrialVisualFloor);
            if (!isFinite(floor))
                floor = Math.max(0, Number(data().currPass) || 0);
            var next = floor + 1, target = next % 2 ? this.rolePosX1 : this.rolePosX0;
            var duration = typeof seconds === 'number' && isFinite(seconds) ? Math.max(0.25, Math.min(2, seconds)) : 2;
            this.gotoType = kind;
            this.moveLeng = this.leng + 1;
            for (var i = 0; i < this.leng; i++) {
                var row = this['c' + i];
                row.stopAllActions();
                row.runAction(cc.MoveBy.create(duration, cc.p(0, -this.zzH)));
            }
            this.roleBox.stopAllActions();
            this.roleBox.setScaleX((next % 2 ? 1 : -1) * (this.__nhTrialFacing || 1));
            this.roleBox.gotoPlay(armatureRun);
            this.roleBox.runAction(cc.Sequence.create(cc.MoveTo.create(duration, cc.p(target, this.rolePosY + 28)), cc.CallFunc.create(function (_node, actionKind) {
                scene.__nhTrialVisualFloor = next;
                scene.gotoStopRole(_node, actionKind);
            }, this, kind)));
            AudioEngine.getInstance().playerEffectSound('run', 'mp3', true);
        };
        proto.onRemoveMe = function () {
            this.__nhTrialDisposed = true;
            this.__nhTrialRecords = null;
            this.__nhTrialPending = false;
            this.__nhTrialEntryAction = null;
            if (trialPending && trialPending.scene === this)
                trialPending = null;
            return remove.apply(this, arguments);
        };
        proto.__nhTrialReplay = true;
    }
    if (typeof ExamScene !== 'undefined' && typeof ExamData !== 'undefined')
        installTrial(ExamScene, ExamData);
    if (typeof NewExamScene !== 'undefined' && typeof NewExamData !== 'undefined')
        installTrial(NewExamScene, NewExamData);
}

"use strict";
function __NH_INSTALL_SUPPORT_FIXES() {
    if (typeof HouYuanTuanScene === 'undefined' || !HouYuanTuanScene.prototype)
        return;
    var boardProto = HouYuanTuanScene.prototype;
    if (typeof GameConnection !== 'undefined' && typeof GameConnection.handleGameCommand === 'function' &&
        typeof GameConnection.onmessage === 'function' && !boardProto.__nhSupportConfirmed) {
        var confirmed = RoleData.getInstance().aids.slice(0), version = 0, opening = null, current = null;
        var initBoard = boardProto.initUI, removeBoard = boardProto.onRemoveMe, boardReply = boardProto.onChangeOperResultData;
        var refreshBoard = function (scene) {
            var board = RoleData.getInstance().getAids();
            for (var i = 0; i < scene.boxList.length; i++)
                scene.boxList[i].updata(board[i], i);
            scene.pageView.setList();
            scene.check_Show();
        };
        var restoreBoard = function () {
            var roles = RoleData.getInstance();
            roles.aids = confirmed.slice(0);
            roles.aidsTiro = confirmed.length === 0;
        };
        var releaseBoard = function () {
            var scene = current;
            opening = null;
            if (!scene || scene.__nhSupportDisposed)
                return;
            scene.__nhSupportReady = false;
            scene.isUpdate = false;
            OperResultData.getInstance().removeEventListener(EventType.EVENT_CHANGE, scene, 'onChangeOperResultData');
            restoreBoard();
            refreshBoard(scene);
            scene.setEnabledAll(true);
            if (PromptView.page === 'loading')
                PromptView.setPageView(null);
        };
        var dispatchBoard = GameConnection.handleGameCommand;
        GameConnection.handleGameCommand = function (key, value) {
            var result = dispatchBoard.apply(this, arguments);
            //Capture only actual reducer delivery:345's buffered packets must not
            //replace this snapshot before354 applies their authoritative models.
            if (key === 'heros' && value && Object.prototype.hasOwnProperty.call(value, 'aids') && Array.isArray(value.aids)) {
                confirmed = value.aids.slice(0);
                version++;
            }
            return result;
        };
        var receiveBoard = GameConnection.onmessage;
        GameConnection.onmessage = function (message) {
            if (!this.networkInstableState && message && message.chatReset === true) {
                confirmed = [];
                version++;
                opening = null;
                if (current) {
                    current.__nhSupportReady = false;
                    current.isUpdate = false;
                }
            }
            return receiveBoard.apply(this, arguments);
        };
        boardProto.initUI = function () {
            current = this;
            this.__nhSupportDisposed = false;
            this.__nhSupportReady = false;
            this.isUpdate = false;
            restoreBoard();
            this.__nhSupportRefreshOnly = confirmed.length > 0;
            //3830 otherwise skips any request on subsequent openings. Its cached
            //board may be an unconfirmed teardown save, or another device's old data.
            RoleData.getInstance().aidsTiro = true;
            var action = { scene: this, version: version };
            opening = action;
            var session = GameConnection.session, send = session && session.send, handedOff = false;
            var observe = function (event) {
                var result = send.apply(this, arguments);
                if (event && event.source && Object.prototype.hasOwnProperty.call(event.source, 'openAids'))
                    handedOff = true;
                return result;
            };
            if (typeof send === 'function')
                session.send = observe;
            try {
                return initBoard.apply(this, arguments);
            }
            finally {
                if (session && session.send === observe)
                    session.send = send;
                if (!handedOff && opening === action)
                    releaseBoard();
            }
        };
        boardProto.onChangeOperResultData = function () {
            if (Number(OperResultData.getInstance().type) !== 19)
                return boardReply.apply(this, arguments);
            if (!opening || opening.scene !== this || this.__nhSupportDisposed || version <= opening.version)
                return;
            opening = null;
            this.__nhSupportReady = true;
            refreshBoard(this);
            return boardReply.apply(this, arguments);
        };
        var touchBoard = boardProto.onTouchesEnded, chooseBoard = boardProto.table_call_fun;
        boardProto.onTouchesEnded = function () {
            //A failed refresh is still closable, but an unconfirmed board cannot be
            //edited and then silently treated as saved. Reopen deliberately to retry.
            var kind = this.touchTarget && this.touchTarget._ty;
            if (!this.__nhSupportReady && kind !== 'closeBtn' && kind !== 'helpBtn')
                return;
            if (!this.__nhSupportDisposed)
                return touchBoard.apply(this, arguments);
        };
        boardProto.table_call_fun = function () {
            if (this.__nhSupportReady && !this.__nhSupportDisposed)
                return chooseBoard.apply(this, arguments);
        };
        boardProto.onRemoveMe = function () {
            if (this.__nhSupportDisposed)
                return;
            this.__nhSupportDisposed = true;
            if (!this.__nhSupportReady)
                this.isUpdate = false;
            if (opening && opening.scene === this)
                opening = null;
            try {
                return removeBoard.apply(this, arguments);
            }
            finally {
                //3828 sends the edited board only at teardown. Until an actual heros
                //reply arrives, retain the last confirmed model rather than a fake save.
                this.__nhSupportReady = false;
                if (current === this)
                    current = null;
                restoreBoard();
            }
        };
        GameConnection.__nhRecoverSupportPending = function () { if (opening)
            releaseBoard(); };
        for (var si = 0, supportLife = ['onclose', 'onerror', 'sessionClose', 'reconnect', 'login']; si < supportLife.length; si++)
            (function (name) {
                var original = GameConnection[name];
                if (typeof original === 'function')
                    GameConnection[name] = function () { releaseBoard(); return original.apply(this, arguments); };
            })(supportLife[si]);
        boardProto.__nhSupportConfirmed = true;
    }
    if (HouYuanTuanScene.prototype.__nhSupportGuide)
        return;
    var proto = HouYuanTuanScene.prototype, receive = proto.onChangeOperResultData;
    if (typeof receive !== 'function')
        return;
    function canGuide(scene) {
        // Support unlocks at30. An older account opening it for the first time
        // should retain normal navigation, even if its beginner ninjas remain.
        if (typeof UserData === 'undefined' || Number(UserData.getInstance().lv) !== 30 ||
            typeof RoleData === 'undefined')
            return false;
        var roles = RoleData.getInstance(), list = scene.pageView && scene.pageView.viewLabel && scene.pageView.viewLabel.list;
        if (!list || typeof roles.getRole_num !== 'function')
            return false;
        // Tiro1930/1933 stages42/44 use the FIRST owned role9/10, and1677
        // indexOf is strict. Check those exact keys, not a different spare copy.
        var guard = roles.getRole_num(9), scout = roles.getRole_num(10);
        return !!(guard && scout && guard.length && scout.length &&
            list.indexOf(guard[0]) >= 0 && list.indexOf(scout[0]) >= 0);
    }
    proto.onChangeOperResultData = function () {
        if (typeof OperResultData === 'undefined' || Number(OperResultData.getInstance().type) !== 19 ||
            typeof PromptLayer === 'undefined' || typeof PromptLayer.setPageView !== 'function')
            return receive.apply(this, arguments);
        var show = PromptLayer.setPageView, scene = this;
        PromptLayer.setPageView = function (page, data) {
            // Preserve callback3848's list refresh, listener removal and loading
            // dismissal. Only the invalid forced guide entrance is filtered.
            if (page === 'tiroScene' && Number(data) === 41 && (scene.__nhSupportRefreshOnly || !canGuide(scene)))
                return;
            return show.apply(this, arguments);
        };
        try {
            return receive.apply(this, arguments);
        }
        finally {
            PromptLayer.setPageView = show;
        }
    };
    proto.__nhSupportGuide = true;
}

"use strict";
function __NH_INSTALL_RING_CLIENT_FIXES() {
    if (typeof AreaTeamScene !== 'undefined' && AreaTeamScene.prototype &&
        typeof GameConnection !== 'undefined' && typeof GameConnection.onmessage === 'function' &&
        !AreaTeamScene.prototype.__nhRingReplies) {
        var team = AreaTeamScene.prototype, sendTeam = team.send, replyTeam = team.onMessageBack;
        var removeTeam = team.onRemoveMe, initTeam = team.initUI, pending = null;
        var active = function (scene) {
            return scene && !scene.__nhRingDisposed && typeof ContentView !== 'undefined' && ContentView.currentPage === scene;
        };
        var detach = function (scene) {
            RoleData.getInstance().removeEventListener(EventType.EVENT_CHANGE, scene, 'onMessageBack');
            ChatData.getInstance().removeEventListener(EventType.EVENT_CHANGE, scene, 'onError');
        };
        var roster = function (scene) {
            scene.ringsList = RoleData.getInstance().rings.slice(0);
            //3795 clears PromptView while redrawing. An authoritative roster refresh
            //must not dismiss the reconnect advice produced by failed send341/349.
            var show = PromptView.setPageView, preserve = PromptView.page && PromptView.page !== 'loading';
            if (preserve)
                PromptView.setPageView = function (page) { if (page != null)
                    return show.apply(this, arguments); };
            try {
                scene.onChangeRoleData();
            }
            finally {
                PromptView.setPageView = show;
            }
        };
        var release = function (restore) {
            var action = pending;
            pending = null;
            if (!action)
                return;
            var scene = action.scene;
            scene.__nhRingPending = false;
            detach(scene);
            if (!restore || !active(scene))
                return;
            if (action.command === 'setRingFighter') {
                scene.__nhRingSyncRoster = true;
                roster(scene);
            }
            scene.setEnabledAll(true);
            // Preserve the actual reconnect tip. No battle, score, energy or request
            // is invented, refunded or automatically repeated after an outage.
            if (PromptView.page === 'loading')
                PromptView.setPageView(null);
        };
        var sameRoster = function (left, right) {
            if (!left || !right || left.length !== 9 || right.length !== 9)
                return false;
            for (var i = 0; i < 9; i++)
                if (String(left[i]) !== String(right[i]))
                    return false;
            return true;
        };
        var challengeReply = function (message) {
            // Only ringCommand's accepted combat packet contains all these models.
            // A generic hero delta, rank notification, or bootstrap is not an ACK.
            var turns = message && message.trun, heroes = message && message.heros;
            return !!(turns && turns.t1 && turns.t1.fightRes && turns.t2 && turns.t2.fightRes &&
                message.ring && typeof message.ring.oldScore === 'number' && typeof message.ring.oldDan === 'number' &&
                message.opponent && typeof message.opponent.name === 'string' && heroes && heroes.rings && heroes.rings.length === 9 &&
                heroes.h1 && heroes.h1.length === 3 && heroes.h2 && heroes.h2.length === 3 && heroes.h3 && heroes.h3.length === 3);
        };
        team.initUI = function () { this.__nhRingDisposed = false; return initTeam.apply(this, arguments); };
        team.send = function (command) {
            if (command !== 'ringChallege' && command !== 'setRingFighter')
                return sendTeam.apply(this, arguments);
            if (pending || !active(this))
                return;
            var action = { scene: this, command: command, rings: this.ringsList.slice(0) };
            pending = action;
            this.__nhRingPending = true;
            var session = GameConnection.session, send = session && session.send, handedOff = false;
            var observe = function (event) {
                var result = send.apply(this, arguments);
                if (event && event.source && Object.prototype.hasOwnProperty.call(event.source, command))
                    handedOff = true;
                return result;
            };
            if (typeof send === 'function')
                session.send = observe;
            try {
                return sendTeam.apply(this, arguments);
            }
            finally {
                if (session && session.send === observe)
                    session.send = send;
                //3806 attaches two broad model listeners. Chat is not an error, and a
                //hero update is not battle acceptance. Process the exact packet below.
                detach(this);
                if (!handedOff && pending === action)
                    release(true);
            }
        };
        // Do not let an unrelated model event or a stale direct callback navigate.
        team.onMessageBack = function () { };
        team.onError = function () { };
        var touchTeam = team.onTouchesEnded, selectTeam = team.tableCellTouched;
        team.onTouchesEnded = function () { if (!this.__nhRingPending && !this.__nhRingDisposed)
            return touchTeam.apply(this, arguments); };
        team.tableCellTouched = function () { if (!this.__nhRingPending && !this.__nhRingDisposed)
            return selectTeam.apply(this, arguments); };
        team.onRemoveMe = function () {
            this.__nhRingDisposed = true;
            detach(this);
            if (pending && pending.scene === this)
                release(false);
            return removeTeam.apply(this, arguments);
        };
        var receiveRing = GameConnection.onmessage;
        GameConnection.onmessage = function (message) {
            //345 queues the whole packet while unstable; only354's real dispatch
            //may acknowledge it. Wait until all legacy models have been applied.
            var buffered = this.networkInstableState, action = pending;
            var result = receiveRing.apply(this, arguments);
            if (buffered || !message || message.recoveryError)
                return result;
            if (action && pending === action && active(action.scene)) {
                var accepted = action.command === 'ringChallege' ? challengeReply(message) :
                    message.operResult && Number(message.operResult.type) === 0 && Number(message.operResult.res) === 0 &&
                        message.heros && sameRoster(message.heros.rings, action.rings);
                if (accepted) {
                    var scene = action.scene;
                    release(false);
                    if (action.command === 'setRingFighter') {
                        scene.__nhRingSyncRoster = false;
                        roster(scene);
                        scene.setEnabledAll(true);
                    }
                    //Original3803 retains the established camp navigation, after models
                    //are complete. Repeated packets cannot reopen it without a new action.
                    replyTeam.call(scene);
                }
            }
            var current = typeof ContentView !== 'undefined' && ContentView.currentPage;
            if (!pending && active(current) && current.__nhRingSyncRoster && message.heros && message.heros.rings) {
                current.__nhRingSyncRoster = false;
                roster(current);
            }
            return result;
        };
        GameConnection.__nhRecoverRingPending = function () { release(true); };
        for (var ri = 0, lives = ['onclose', 'onerror', 'sessionClose', 'reconnect', 'login']; ri < lives.length; ri++)
            (function (name) {
                var original = GameConnection[name];
                if (typeof original === 'function')
                    GameConnection[name] = function () { release(true); return original.apply(this, arguments); };
            })(lives[ri]);
        team.__nhRingReplies = true;
    }
    if (typeof AreaHelpScene !== 'undefined' && AreaHelpScene.prototype && !AreaHelpScene.prototype.__nhZeroBadge) {
        var help = AreaHelpScene.prototype.initUI;
        AreaHelpScene.prototype.initUI = function () {
            var create = cc.Sprite.create;
            cc.Sprite.create = function (path) {
                // AreaScene1893 already uses01 for unranked players. Help3626 alone
                // tries the nonexistent00 asset and passes null into native addChild.
                if (path === 'image/iarea/dxc_jjc_huizhang_00.png')
                    return create.call(this, 'image/iarea/dxc_jjc_huizhang_01.png');
                return create.apply(this, arguments);
            };
            try {
                var result = help.apply(this, arguments);
                if (this.img && this.img._url === 'dxc_jjc_huizhang_00')
                    this.img._url = 'dxc_jjc_huizhang_01';
                return result;
            }
            finally {
                cc.Sprite.create = create;
            }
        };
        AreaHelpScene.prototype.__nhZeroBadge = true;
    }
    if (typeof AreaScene !== 'undefined' && AreaScene.prototype && !AreaScene.prototype.__nhOwnBracket) {
        var enter = AreaScene.prototype.initUI;
        AreaScene.prototype.initUI = function () {
            var result = enter.apply(this, arguments);
            // Bootstrap supplies a cached (possibly empty) ranking list, so1884
            // skips the branch that normally selects the player's level bracket.
            // This only sets entrance selection; manual tab browsing remains intact.
            this.changeTabMenu(Config.getInstance().getBattleListIndex());
            return result;
        };
        AreaScene.prototype.__nhOwnBracket = true;
    }
}

"use strict";
/** War-only facade used by narrowly transformed recovered callbacks. It never
 * writes TeamData or replaces its global getter. Normal clan UI stays live. */
var __NH_CLAN_WAR_IDENTITY = null;
var __NH_CLAN_WAR_DEADLINE = 0;
var __NH_CLAN_WAR_LAST = null;
var __NH_CLAN_WAR_INSTALLED = false;
function __NH_CLAN_WAR_ACTIVE() {
    return !!__NH_CLAN_WAR_IDENTITY && Date.now() < __NH_CLAN_WAR_DEADLINE;
}
var __NH_CLAN_WAR_TEAM_DATA = {
    getInstance: function () {
        var identity = __NH_CLAN_WAR_ACTIVE() ? __NH_CLAN_WAR_IDENTITY : null;
        return { myTeamName: identity ? identity.name : null, level: identity ? identity.level : 0,
            myTeamTitle: identity ? identity.title : 0, clearTeamData: function () { } };
    }
};
var __NH_CLAN_WAR_CONNECTION = {
    send: function (command, payload) {
        // initUI3412 used to request the *live* clan profile under a frozen name.
        // War identity/roster is already supplied by getTeamWarInfo instead.
        if (command !== 'getTeamInfo')
            return GameConnection.send(command, payload);
    }
};
function __NH_CLAN_WAR_UNAVAILABLE(view) {
    if (view && view.timename != null && view.rootNode && view.rootNode.unschedule)
        view.rootNode.unschedule(view.timename);
    if (view && view.setEnabledAll)
        view.setEnabledAll(false);
    if (typeof PromptView !== 'undefined')
        PromptView.setPageView(null);
    var member = typeof TeamData !== 'undefined' ? TeamData.getInstance() : null;
    if (typeof ContentView !== 'undefined')
        ContentView.setPageView(member && member.myTeamName ? 'JuntuanWarSceneNoOpen' : 'juntuan');
}
function __NH_CLAN_WAR_TICK(node) {
    // Callback3416 runs with the scheduled root node as `this`. Its two terminal
    // branches assume a live clan; frozen participants can have left/disbanded.
    var war = typeof TeamWarData !== 'undefined' ? TeamWarData.getInstance() : null;
    var remaining = war ? Number(war.warlefttime) : 0;
    if (__NH_CLAN_WAR_ACTIVE() && isFinite(remaining) && remaining > 1)
        return true;
    if (war)
        war.warlefttime = 0;
    __NH_CLAN_WAR_IDENTITY = null;
    __NH_CLAN_WAR_DEADLINE = 0;
    if (__NH_CLAN_WAR_LAST)
        __NH_CLAN_WAR_LAST.closed = true;
    __NH_CLAN_WAR_UNAVAILABLE(node && node.controller ? node.controller : node);
    return false;
}
function __NH_INSTALL_CLAN_WAR_FIXES() {
    if (__NH_CLAN_WAR_INSTALLED || typeof GameConnection === 'undefined' || !GameConnection.onmessage)
        return;
    __NH_CLAN_WAR_INSTALLED = true;
    var receive = GameConnection.onmessage;
    GameConnection.onmessage = function (message) {
        if (message && GameConnection.networkInstableState && !message.recoveryError &&
            (message.chatReset || message.teamWar || Object.prototype.hasOwnProperty.call(message, 'clanWarIdentity'))) {
            //345 queues the complete snapshot;354 must apply reset, identity and
            //model in that same order. Consuming identity now loses it after a
            //buffered bootstrap reset is replayed. Delegate so other metadata
            //wrappers (including Beast) also retain their original receipt time.
            if (message.clanWarIdentity && typeof message.clanWarIdentity === 'object') {
                var buffered = {}, identityCopy = {}, original = message.clanWarIdentity;
                for (var field in message)
                    if (Object.prototype.hasOwnProperty.call(message, field))
                        buffered[field] = message[field];
                for (var member in original)
                    if (Object.prototype.hasOwnProperty.call(original, member))
                        identityCopy[member] = original[member];
                identityCopy.__nhReceivedAt = Math.min(Date.now(), typeof original.__nhReceivedAt === 'number' && isFinite(original.__nhReceivedAt) ? original.__nhReceivedAt : Date.now());
                buffered.clanWarIdentity = identityCopy;
                message = buffered;
            }
            return receive.call(this, message);
        }
        if (message && message.chatReset)
            __NH_CLAN_WAR_LAST = null;
        if (message && (message.chatReset || message.teamWar && message.teamWar.isWarOpened === false)) {
            if (!message.chatReset && message.teamWar.matchId && (!__NH_CLAN_WAR_LAST || __NH_CLAN_WAR_LAST.matchId === message.teamWar.matchId))
                __NH_CLAN_WAR_LAST = { matchId: message.teamWar.matchId, endsAt: __NH_CLAN_WAR_LAST ? __NH_CLAN_WAR_LAST.endsAt : 0, deadline: 0, closed: true };
            __NH_CLAN_WAR_IDENTITY = null;
            __NH_CLAN_WAR_DEADLINE = 0;
        }
        if (message && Object.prototype.hasOwnProperty.call(message, 'clanWarIdentity')) {
            var identity = message.clanWarIdentity, war = message.teamWar;
            __NH_CLAN_WAR_IDENTITY = null;
            __NH_CLAN_WAR_DEADLINE = 0;
            if (identity && war && war.isWarOpened === true && war.matchId === identity.matchId &&
                typeof identity.matchId === 'string' && identity.matchId.length > 0 &&
                typeof identity.name === 'string' && identity.name.length > 0 &&
                typeof identity.level === 'number' && identity.level >= 1 && Math.floor(identity.level) === identity.level &&
                typeof identity.title === 'number' && identity.title >= 1 && identity.title <= 6 &&
                typeof identity.serverNow === 'number' && isFinite(identity.serverNow) &&
                typeof identity.startsAt === 'number' && identity.startsAt <= identity.serverNow &&
                typeof identity.endsAt === 'number' && isFinite(identity.endsAt) && identity.endsAt > identity.serverNow &&
                (!__NH_CLAN_WAR_LAST || (identity.matchId === __NH_CLAN_WAR_LAST.matchId ?
                    !__NH_CLAN_WAR_LAST.closed && Date.now() < __NH_CLAN_WAR_LAST.deadline : identity.endsAt > __NH_CLAN_WAR_LAST.endsAt))) {
                // Anchor a deferred packet when received, not when the player later
                //dismisses the network dialog. No clock skew or waiting extends it.
                var receivedAt = Math.min(Date.now(), typeof identity.__nhReceivedAt === 'number' && isFinite(identity.__nhReceivedAt) ? identity.__nhReceivedAt : Date.now());
                __NH_CLAN_WAR_DEADLINE = receivedAt + identity.endsAt - identity.serverNow;
                if (__NH_CLAN_WAR_LAST && __NH_CLAN_WAR_LAST.matchId === identity.matchId)
                    __NH_CLAN_WAR_DEADLINE = Math.min(__NH_CLAN_WAR_DEADLINE, __NH_CLAN_WAR_LAST.deadline);
                var expired = Date.now() >= __NH_CLAN_WAR_DEADLINE;
                __NH_CLAN_WAR_LAST = { matchId: identity.matchId, endsAt: identity.endsAt, deadline: __NH_CLAN_WAR_DEADLINE, closed: expired };
                if (!expired)
                    __NH_CLAN_WAR_IDENTITY = { matchId: identity.matchId, name: identity.name, level: identity.level, title: identity.title };
            }
            var legacy = {};
            for (var key in message)
                if (Object.prototype.hasOwnProperty.call(message, key) && key !== 'clanWarIdentity')
                    legacy[key] = message[key];
            message = legacy;
        }
        return receive.call(this, message);
    };
}

"use strict";
function __NH_INSTALL_INVENTORY_BATCH_FIXES() {
    if (typeof GameConnection === 'undefined' || GameConnection.__nhInventoryBatch ||
        typeof InventoryData === 'undefined' || !InventoryData.prototype ||
        typeof InforTip === 'undefined' || !InforTip.prototype || typeof nad === 'undefined')
        return;
    var queue = null, inFlight = null, issuing = false, processing = false, wantNext = false;
    var lastId = 0, seen = {}, seenOrder = [];
    function data() { return InventoryData.getInstance(); }
    function valid() {
        if (!queue || queue.remaining <= 0)
            return false;
        var item = data().getItemObj(queue.c, queue.idx);
        return !!item && Number(item.id) === queue.id && Number(item.s) > 0;
    }
    function stop(clearFlight) {
        queue = null;
        wantNext = false;
        if (clearFlight)
            inFlight = null;
        var inventory = data();
        OperResultData.getInstance().removeEventListener(EventType.EVENT_CHANGE, inventory, 'onChangeOperResult');
        inventory.dataCancelShow = true;
        inventory.showHulueBtn = false;
        inventory.isRenzheType = false;
        inventory.piliangType = false;
    }
    function remember(id) {
        var key = String(id);
        seen[key] = true;
        seenOrder.push(key);
        if (seenOrder.length > 2048)
            delete seen[seenOrder.shift()];
    }
    // New actions share a millisecond clock in the old client. The backend uses
    // this timestamp as its durable idempotency key. Retrying an existing NEvent
    // via session.send does not construct another event and retains its key.
    var eventFactory = nad.NEvent;
    nad.NEvent = function (type, source, target, timestamp) {
        var event = eventFactory.apply(this, arguments);
        if (type === nad.SESSION_MESSAGE && timestamp === undefined) {
            var id = Math.max(Number(event.timeStamp), lastId + 1);
            if (!isFinite(id) || id < 1 || id > 9007199254740991)
                throw new Error('Invalid action timestamp');
            event.timeStamp = lastId = id;
        }
        if (issuing && source && source.useItem && source.useItem.inventoryReceipt === 1)
            inFlight = Number(event.timeStamp);
        return event;
    };
    var send = GameConnection.send;
    GameConnection.send = function (command, payload) {
        if (!issuing || command !== 'useItem')
            return send.call(this, command, payload);
        var opted = {};
        for (var key in payload)
            if (Object.prototype.hasOwnProperty.call(payload, key))
                opted[key] = payload[key];
        opted.inventoryReceipt = 1;
        payload = opted;
        var active = queue, session = GameConnection.session, transportSend = session && session.send, handedOff = false;
        var observe = function (event) {
            var result = transportSend.apply(this, arguments);
            if (event && event.source && event.source.useItem && event.source.useItem.inventoryReceipt === 1)
                handedOff = true;
            return result;
        };
        if (typeof transportSend === 'function')
            session.send = observe;
        try {
            return send.call(this, command, payload);
        }
        finally {
            if (session && session.send === observe)
                session.send = transportSend;
            //400 reserves the receipt before transport341 actually sends.341 catches
            //send exceptions, so an ID alone cannot prove an in-flight action. Drop
            //only this unsent queue; accepted sends retain their ID until a receipt
            //or lifecycle boundary, without resending or undoing inventory locally.
            if (!handedOff && queue === active)
                stop(true);
        }
    };
    var sendItem = InventoryData.prototype.sendItem;
    InventoryData.prototype.sendItem = function (command, category, index) {
        if (command === 'useItem' && inFlight !== null && !processing)
            return;
        if (!queue)
            return sendItem.apply(this, arguments);
        if (command !== 'useItem' || Number(category) !== queue.c || Number(index) !== queue.idx) {
            stop();
            return sendItem.apply(this, arguments);
        }
        if (processing) {
            wantNext = true;
            return;
        }
        if (!valid()) {
            stop();
            return;
        }
        issuing = true;
        try {
            return sendItem.apply(this, arguments);
        }
        finally {
            issuing = false;
            if (inFlight === null)
                stop();
        }
    };
    var press = InforTip.prototype.onPressButton;
    InforTip.prototype.onPressButton = function (button) {
        if (button && button._ty === 'piliangshiyong') {
            if (inFlight !== null || queue)
                return;
            var selected = this.data, item = selected && data().getItemObj(selected.c, selected.idx);
            var count = item && Math.min(Number(item.s), Number(selected.s));
            if (!item || Number(selected.c) !== 2 || Number(item.id) !== Number(selected.id) ||
                !isFinite(count) || count < 1 || count > 999 || Math.floor(count) !== count)
                return;
            queue = { id: Number(item.id), c: 2, idx: Number(selected.idx), remaining: count };
        }
        try {
            return press.apply(this, arguments);
        }
        finally {
            if (queue && inFlight === null)
                stop();
        }
    };
    function continuation(owner, name) {
        if (!owner || !owner.prototype || typeof owner.prototype[name] !== 'function')
            return;
        var original = owner.prototype[name];
        owner.prototype[name] = function () {
            if (!queue || inFlight !== null) {
                if (!queue)
                    stop();
                return;
            }
            if (!valid()) {
                stop();
                return;
            }
            try {
                return original.apply(this, arguments);
            }
            finally {
                if (inFlight === null)
                    stop();
            }
        };
    }
    if (typeof GainItemScene !== 'undefined')
        continuation(GainItemScene, 'requestMsg');
    if (typeof GainNinJaScene !== 'undefined')
        continuation(GainNinJaScene, 'requestRenzheMsg');
    var receive = GameConnection.onmessage;
    GameConnection.onmessage = function (message) {
        if (!message)
            return receive.call(this, message);
        if (message.chatReset || message.recoveryError || GameConnection.networkInstableState)
            stop(true);
        var receipt = message.inventoryUseReceipt, id = receipt && Number(receipt.requestId);
        var operation = message.operResult, tracked = inFlight !== null && id === inFlight;
        if (receipt) {
            if (!isFinite(id) || id < 1 || Math.floor(id) !== id) {
                stop(true);
                return;
            }
            if (seen[String(id)])
                return; // Never replay an old delta over a newer slot.
            remember(id);
            var clean = {};
            for (var key in message)
                if (Object.prototype.hasOwnProperty.call(message, key) && key !== 'inventoryUseReceipt')
                    clean[key] = message[key];
            message = clean;
            // A cancelled action still commits its state, but cannot consume the
            // listener belonging to a later action or reopen its reward dialog.
            if (!tracked)
                delete message.operResult;
        }
        if (inFlight !== null && operation && Number(operation.type) === 11 && !receipt) {
            // A server without receipt support may commit one action. Show it once,
            // but do not guess which later packet would acknowledge another action.
            stop(true);
            var fallback = receive.call(this, message);
            if (!message.recoveryError && Number(operation.res) === 0)
                PropertyTools.gainItem(operation.param);
            return fallback;
        }
        if (!tracked) {
            var passive = receive.call(this, message);
            if (queue && !valid())
                stop();
            return passive;
        }
        var active = queue;
        if (!operation || Number(operation.type) !== 11 || Number(operation.res) !== 0 || !message.inventory) {
            stop(true);
            return receive.call(this, message);
        }
        processing = true;
        wantNext = false;
        try {
            var result = receive.call(this, message);
        }
        catch (error) {
            stop(true);
            throw error;
        }
        finally {
            processing = false;
            inFlight = null;
        }
        if (!active || queue !== active)
            return result;
        active.remaining--;
        if (!valid() || data().isRenzheType && !RoleData.getInstance().getMaxLimit() ||
            data().dataCancelShow === false && !wantNext) {
            stop();
            return result;
        }
        if (wantNext) {
            wantNext = false;
            data().sendItem('useItem', active.c, active.idx, -1);
        }
        return result;
    };
    if (typeof BeiBaoScene !== 'undefined' && BeiBaoScene.prototype) {
        var exit = BeiBaoScene.prototype.onExit;
        BeiBaoScene.prototype.onExit = function () { stop(); return exit.apply(this, arguments); };
    }
    // These handlers exist in the recovered transport. Reconnect never resumes
    // an abandoned queue; the server ledger still owns any committed action.
    for (var i = 0, names = ['onclose', 'onerror', 'sessionClose', 'reconnect', 'login']; i < names.length; i++)
        (function (name) {
            var original = GameConnection[name];
            if (typeof original === 'function')
                GameConnection[name] = function () { stop(true); return original.apply(this, arguments); };
        })(names[i]);
    GameConnection.__nhInventoryBatch = true;
}

"use strict";
function __NH_INSTALL_NINJA_WAR_FIXES() {
    if (typeof RanshouRole !== 'undefined' && RanshouRole.prototype &&
        typeof RanshouRole.prototype.OperResultDataChange === 'function' && !RanshouRole.prototype.__nhPurchaseReceipt) {
        var purchaseReceipt = RanshouRole.prototype.OperResultDataChange;
        RanshouRole.prototype.OperResultDataChange = function () {
            var receipt = OperResultData.getInstance(), index = ShopNewData.getInstance().currentbuy_index;
            var selected = this.itemGroupObject && this.itemGroupObject[index];
            //3871 assigns type28 instead of comparing it, then dereferences index-1
            //after a completed purchase. Only the selected offer's real receipt may
            //reach that callback; a duplicate or another feature's reply is inert.
            if (Number(receipt.type) !== 28 || !selected ||
                Number(receipt.res) === 0 && Number(receipt.param) !== Number(selected.onlyid))
                return;
            return purchaseReceipt.apply(this, arguments);
        };
        RanshouRole.prototype.__nhPurchaseReceipt = true;
    }
    if (typeof RanshaoZhanDui !== 'undefined' && RanshaoZhanDui.prototype &&
        typeof RanshaoZhanDui.prototype.initUI === 'function' && !RanshaoZhanDui.prototype.__nhSquadCancel) {
        var squadUI = RanshaoZhanDui.prototype.initUI;
        RanshaoZhanDui.prototype.initUI = function () {
            var result = squadUI.apply(this, arguments);
            //2061 alternates Battle/Cancel at the same CCB position. The CCB also
            //contains a separate hidden X at(433,180), omitted from its touch list.
            //Expose that existing node:2067's closeBtn branch restores the pan via
            //refreshSeat2908, closes ContentLayer and re-enables MainView, with no
            //server command. Preserve the original alive/dead Battle gate unchanged.
            var close = this.scene && this.scene.controller && this.scene.controller.btn_close;
            if (close && this.touchesList) {
                close._ty = 'closeBtn';
                close.setVisible(true);
                if (this.touchesList.indexOf(close) < 0)
                    this.touchesList.push(close);
            }
            return result;
        };
        RanshaoZhanDui.prototype.__nhSquadCancel = true;
    }
    if (typeof RanshaoyuanzhengScene !== 'undefined' && RanshaoyuanzhengScene.prototype &&
        RanshaoyuanzhengScene.prototype.WarInfoDataChange && !RanshaoyuanzhengScene.prototype.__nhChestAcknowledgement) {
        var changed = RanshaoyuanzhengScene.prototype.WarInfoDataChange;
        RanshaoyuanzhengScene.prototype.WarInfoDataChange = function () {
            var war = WarInfoData.getInstance();
            //2913's first pending-chest packet sets initBoon but skips enabling the
            //Layer.2916 sends the claim; the later status1 packet used to skip both
            //initialization branches and leave the next-stage controls disabled.
            if (!this.initBoon && arguments[0] && war.currPass > 0 && war.status === 0)
                this.__nhAwaitingChestStage = war.currPass;
            var result = changed.apply(this, arguments);
            if (this.__nhAwaitingChestStage !== undefined && war.status === 1 && war.currPass === this.__nhAwaitingChestStage) {
                this.__nhAwaitingChestStage = undefined;
                this.setEnabledAll(true);
            }
            return result;
        };
        RanshaoyuanzhengScene.prototype.__nhChestAcknowledgement = true;
    }
    if (typeof RanShaoDajie !== 'undefined' && RanShaoDajie.prototype &&
        !RanShaoDajie.prototype.__nhRobberySelection && RanShaoDajie.prototype.onRemoveMe) {
        var proto = RanShaoDajie.prototype, remove = proto.onRemoveMe;
        proto.onRemoveMe = function () {
            var dirty = !!this.setWarDefendersBoon;
            //2363 edits myDefenders;2357 incorrectly sent the unrelated hids array.
            // Snapshot before cleanup. Later UI edits cannot alter this request.
            var selection = dirty ? WarInfoData.getInstance().myDefenders.slice(0) : null;
            this.setWarDefendersBoon = false;
            try {
                var result = remove.apply(this, arguments);
                if (dirty)
                    GameConnection.send('setWarDefenders', { hids: selection });
                return result;
            }
            catch (error) {
                this.setWarDefendersBoon = dirty;
                throw error;
            }
        };
        proto.__nhRobberySelection = true;
    }
    if (typeof GameConnection !== 'undefined' && GameConnection.onmessage && GameConnection.handleGameCommand && !GameConnection.__nhNinjaWarDaily) {
        var receive = GameConnection.onmessage;
        GameConnection.onmessage = function (message) {
            if (message && message.chatReset) {
                // The main adapter now defers chatReset intact while345 buffers it.
                // Carry a private marker to the actual player reducer as well;354 may
                // pass this wrapper again, so preserve an already-present quota field.
                // No unknown top-level command or extra UserData event is introduced.
                var copy = {}, player = {}, key;
                for (key in message)
                    if (Object.prototype.hasOwnProperty.call(message, key))
                        copy[key] = message[key];
                if (message.player)
                    for (key in message.player)
                        if (Object.prototype.hasOwnProperty.call(message.player, key))
                            player[key] = message.player[key];
                if (!Object.prototype.hasOwnProperty.call(player, 'ninjaWarDaily'))
                    player.ninjaWarDaily = null;
                copy.player = player;
                message = copy;
            }
            return receive.call(this, message);
        };
        var reduce = GameConnection.handleGameCommand;
        GameConnection.handleGameCommand = function (command, payload) {
            if (command !== 'player' || !payload || !Object.prototype.hasOwnProperty.call(payload, 'ninjaWarDaily'))
                return reduce.apply(this, arguments);
            var quota = payload.ninjaWarDaily, player = {}, hasPlayer = false;
            for (var key in payload)
                if (Object.prototype.hasOwnProperty.call(payload, key) && key !== 'ninjaWarDaily') {
                    player[key] = payload[key];
                    hasPlayer = true;
                }
            // This point is reached only when345 actually reduces a packet, also
            // when354 flushes a previously buffered one. No optimistic quota update.
            var result = hasPlayer ? reduce.call(this, command, player) : undefined;
            if (typeof WarInfoData === 'undefined')
                return result;
            var war = WarInfoData.getInstance();
            if (quota === null) {
                war.num = war.total = war.takeNum = war.takeTotal = 0;
                return result;
            }
            if (!quota)
                return result;
            var fields = ['num', 'total', 'takeNum', 'takeTotal'];
            for (var i = 0; i < fields.length; i++) {
                var value = quota[fields[i]];
                if (typeof value !== 'number' || !isFinite(value) || value < 0 || value > 100000 || Math.floor(value) !== value)
                    return result;
            }
            if (quota.total < 1 || quota.takeTotal < 1 || quota.num > quota.total || quota.takeNum > quota.takeTotal)
                return result;
            for (var j = 0; j < fields.length; j++)
                war[fields[j]] = quota[fields[j]];
            // Do not call setObj, dispatchEvents or WarInfoDataChange2913/2364:
            // those callbacks can move the expedition, open/close overlays or claim.
            // Update only the two text nodes proven by those recovered callbacks.
            var texts = typeof Config !== 'undefined' ? Config.getInstance().textObject || {} : {};
            var expedition = typeof MainView !== 'undefined' ? MainView.currentPage : null;
            if (typeof RanshaoyuanzhengScene !== 'undefined' && expedition instanceof RanshaoyuanzhengScene &&
                expedition.scene && expedition.scene.controller && expedition.scene.controller.numTF)
                expedition.scene.controller.numTF.setString((texts[3059] || 'Remaining restarts: ') + '\n' + war.num + '/' + war.total);
            var robbery = typeof ContentLayer !== 'undefined' ? ContentLayer.currentPage : null;
            if (typeof RanShaoDajie !== 'undefined' && robbery instanceof RanShaoDajie &&
                robbery.scene && robbery.scene.controller && robbery.scene.controller.numTF)
                robbery.scene.controller.numTF.setString((texts[3067] || 'Remaining robberies: ') + war.takeNum + '/' + war.takeTotal);
            return result;
        };
        GameConnection.__nhNinjaWarDaily = true;
    }
}

"use strict";
/** Hall-only controls. A recruitment tap remains pending until the current
 * mode advances, is rejected, or its connection lifecycle ends. No local
 * rewards/progress writes and no automatic resend. */
function __NH_INSTALL_HALL_CLIENT_FIXES() {
    if (typeof SuiJiZuDui !== 'undefined' && SuiJiZuDui.prototype && !SuiJiZuDui.prototype.__nhHallAffordability) {
        //2979 tests the configured daily allowance (always10), so its paid branch
        //skips moneyEnough after those ten free refreshes have been exhausted.
        SuiJiZuDui.prototype.check = function () {
            var buildings = BuildData.getInstance();
            if (buildings.getNum(12) > 0)
                return true;
            var cost = buildings.getFuncCost(12, 0);
            return UserData.getInstance().moneyEnough(cost.count, cost.id);
        };
        SuiJiZuDui.prototype.__nhHallAffordability = true;
    }
    if (typeof GameConnection === 'undefined' || GameConnection.__nhHallClaims ||
        typeof GameConnection.send !== 'function' || typeof GameConnection.handleGameCommand !== 'function')
        return;
    var pending = {};
    function model(mode) {
        return mode === 'recInfo' ? (typeof RecInfoData !== 'undefined' ? RecInfoData.getInstance() : null)
            : (typeof NewRecInfoData !== 'undefined' ? NewRecInfoData.getInstance() : null);
    }
    var send = GameConnection.send;
    GameConnection.send = function (command, payload) {
        var mode = command === 'recruit' ? 'recInfo' : command === 'newRecruit' ? 'newRecInfo' : null;
        if (!mode)
            return send.apply(this, arguments);
        if (pending[mode])
            return;
        var data = model(mode), index = data && Number(data.idx);
        if (!data || data.completed || Number(data.progress) < 100 || !isFinite(index) || index < 0 || Math.floor(index) !== index)
            return send.apply(this, arguments);
        var claim = { idx: index }, session = GameConnection.session, transport = session && session.send, handedOff = false;
        pending[mode] = claim;
        var observe = function (event) {
            var result = transport.apply(this, arguments);
            if (event && event.source && Object.prototype.hasOwnProperty.call(event.source, command))
                handedOff = true;
            return result;
        };
        if (typeof transport === 'function')
            session.send = observe;
        try {
            return send.apply(this, arguments);
        }
        finally {
            if (session && session.send === observe)
                session.send = transport;
            //341 returns silently without a session and catches transport exceptions.
            //Only a completed session.send call is evidence of a handed-off claim.
            if (!handedOff && pending[mode] === claim)
                delete pending[mode];
        }
    };
    var reduce = GameConnection.handleGameCommand;
    GameConnection.handleGameCommand = function (command, payload) {
        var result = reduce.apply(this, arguments), claim = pending[command];
        if (claim && (command === 'recInfo' || command === 'newRecInfo')) {
            var data = model(command);
            //Use the reducer, not receipt arrival:345 may defer packets until354.
            //A pre-claim snapshot or unrelated operation cannot acknowledge a claim.
            if (data && Number(data.idx) > claim.idx)
                delete pending[command];
        }
        return result;
    };
    if (typeof GameConnection.onmessage === 'function') {
        var receive = GameConnection.onmessage;
        GameConnection.onmessage = function (message) {
            if (message && (message.recoveryError || message.chatReset))
                pending = {};
            return receive.apply(this, arguments);
        };
    }
    for (var i = 0, lifecycle = ['onclose', 'onerror', 'sessionClose', 'reconnect', 'login']; i < lifecycle.length; i++)
        (function (name) {
            var original = GameConnection[name];
            if (typeof original === 'function')
                GameConnection[name] = function () {
                    pending = {};
                    return original.apply(this, arguments);
                };
        })(lifecycle[i]);
    GameConnection.__nhHallClaims = true;
}

"use strict";
function __NH_INSTALL_ARENA_CLIENT_FIXES() {
    if (typeof JingJiChangScene === 'undefined' || !JingJiChangScene.prototype || JingJiChangScene.prototype.__nhArenaPurchase)
        return;
    var proto = JingJiChangScene.prototype, touch = proto.onTouchesEnded, buy = proto.buyTimesFun;
    if (typeof touch !== 'function' || typeof buy !== 'function')
        return;
    proto.onTouchesEnded = function () {
        var scene = this, show = PromptView.setPageView;
        //2171 chooses the displayed price and confirmation. Record a quote only
        //when that actual branch opens, not from a guessed touch position.
        PromptView.setPageView = function (page, data) {
            if (page === 'tip' && data && data.target === scene && data.fun === 'buyTimesFun') {
                var user = UserData.getInstance();
                scene.__nhArenaQuote = { day: user.arenaDay, purchases: Number(user.pt || 0) };
            }
            return show.apply(this, arguments);
        };
        try {
            return touch.apply(this, arguments);
        }
        finally {
            PromptView.setPageView = show;
        }
    };
    proto.buyTimesFun = function () {
        var quote = this.__nhArenaQuote, user = UserData.getInstance(), remaining = BuildData.getInstance().getNum(7);
        this.__nhArenaQuote = null;
        if (!quote || remaining > 0 || quote.day !== user.arenaDay || quote.purchases !== Number(user.pt || 0)) {
            PromptView.setPageView(null);
            return;
        }
        //2173 keeps the native gold/VIP checks. Add the quote only to its exact
        //synchronous send so a midnight crossing before the daily packet arrives
        //is also rejected by the server, not trusted to the device clock.
        var send = GameConnection.send;
        GameConnection.send = function (command, payload) {
            if (command === 'buyPvpTimes' && typeof quote.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(quote.day))
                return send.call(this, command, { day: quote.day, purchases: quote.purchases });
            return send.apply(this, arguments);
        };
        try {
            return buy.apply(this, arguments);
        }
        finally {
            GameConnection.send = send;
        }
    };
    var arenaChanged = proto.onChangeArenaData;
    if (typeof arenaChanged === 'function')
        proto.onChangeArenaData = function () {
            var result = arenaChanged.apply(this, arguments), fighters = ArenaData.getInstance().fighters || [];
            //2177 clears only a missing rival's honor label. Its previous AreaRole
            //would otherwise retain a clickable stale quote after a partial snapshot.
            for (var i = 0; this.roleList && i < this.roleList.length; i++) {
                var role = this.roleList[i], available = !!fighters[i];
                if (role && role.setVisible)
                    role.setVisible(available);
                if (role && !available && role.setEnabledAll)
                    role.setEnabledAll(false);
            }
            return result;
        };
    proto.__nhArenaPurchase = true;
}

"use strict";
function __NH_INSTALL_ECONOMY_CLIENT_FIXES() {
    if (typeof GameConnection === 'undefined' || !GameConnection.onmessage || GameConnection.__nhEconomyClientFixes)
        return;
    if (typeof NinJaRoomCrawl !== 'undefined' && NinJaRoomCrawl.prototype && typeof NinJaRoomCrawl.prototype.buildUI === 'function') {
        var buildCapture = NinJaRoomCrawl.prototype.buildUI;
        NinJaRoomCrawl.prototype.buildUI = function (index) {
            //1758 uses baked atlas descriptions. Basic's D–UR frame overpromises;
            //its special-mid flag also selects an old C–SSS frame for Advanced.
            //Limit interception to this synchronous build; leave every button alone.
            var tools = GameTools.getInstance(), sprite = tools.getSpritePlist;
            var description = function (name) {
                if (index === 0 && name === 'image/irenzhewu/r_zi_0.png') {
                    var label = cc.LabelTTF.create('Get D–S Ninja', pFont0, 18);
                    label.setColor(cc.c3b(51, 51, 51));
                    return label;
                }
                if (index === 1 && name === 'image/irenzhewu/r_zi_3.png')
                    name = 'image/irenzhewu/r_zi_1.png';
                return sprite.call(this, name);
            };
            tools.getSpritePlist = description;
            try {
                return buildCapture.apply(this, arguments);
            }
            finally {
                if (tools.getSpritePlist === description)
                    tools.getSpritePlist = sprite;
            }
        };
    }
    if (typeof RoomHelp !== 'undefined' && RoomHelp.prototype && typeof RoomHelp.prototype.initUI === 'function') {
        var captureHelp = RoomHelp.prototype.initUI;
        RoomHelp.prototype.initUI = function () {
            //4170→4160 sizes the speech panel to label height+80 without a viewport
            //clamp. Six compact lines retain all rules without the clipped five
            //paragraph layout; keep its font/CCB and restore the shared text table.
            var texts = Config.getInstance().textObject, previous = texts[3111];
            texts[3111] = '● Basic Capture: D, C, B, A or S.\n' +
                '● Advanced Capture: C, B, A, S, SS, SSS or UR.\n' +
                '● Special: 10 A–UR ninjas; at least one S–UR.\n' +
                '● First Basic and Advanced: fixed tutorial recruits.\n' +
                '● Claim one random UR ninja after accumulating\n' +
                '  50 Advanced or 5 Special captures.';
            try {
                return captureHelp.apply(this, arguments);
            }
            finally {
                texts[3111] = previous;
            }
        };
    }
    if (typeof ShiYanShiHelp !== 'undefined' && ShiYanShiHelp.prototype && typeof ShiYanShiHelp.prototype.initUI === 'function') {
        var laboratoryHelp = ShiYanShiHelp.prototype.initUI;
        ShiYanShiHelp.prototype.initUI = function (tab) {
            if (Number(tab) === 2)
                return laboratoryHelp.apply(this, arguments);
            //4172→4160 expands the speech panel to the label's measured width.
            //Modern3113/3115 are single lines; wrap each within its original help
            //region. Skill3116/3117 already have recovered explicit line breaks.
            var texts = Config.getInstance().textObject, id = Number(tab) === 1 ? 3115 : 3113, previous = texts[id];
            texts[id] = id === 3115 ? '● Soul Fusion: pick up to 10 identical ninjas.\n' +
                '  It raises attributes; limits by base class:\n' +
                '  D–B: 20 fusions; A–S: 25 fusions.\n' +
                '  SS–UR: 30 fusions.' : '● Absorb reserve ninjas for EXP and grade points.\n' +
                '  D–SS ninjas can advance one color, then four stars.\n' +
                '  SSS and UR ninjas can gain four stars.\n' +
                '  At max grade, only EXP may increase, below Lv150.';
            try {
                return laboratoryHelp.apply(this, arguments);
            }
            finally {
                texts[id] = previous;
            }
        };
    }
    var decomposition = null, forgeView = null, laboratory = null, practiceAction = null, treasureRules = null, treasureRound = null, costumeRules = null;
    var practiceKey = null;
    var costumeRequest = null;
    function repaintCostumeControls() {
        if (typeof CostumeScene === 'undefined')
            return;
        var content = typeof ContentView !== 'undefined' && ContentView.currentPage;
        var main = typeof MainView !== 'undefined' && MainView.currentPage;
        if (content instanceof CostumeScene)
            costumeAction(content);
        if (main && main !== content && main instanceof CostumeScene)
            costumeAction(main);
    }
    function restorePractice(action) {
        if (!action || action.scene.__nhEconomyDisposed)
            return;
        action.scene.__nhPracticePending = false;
        action.scene.setEnabledAll(true);
        // Keep authoritative pracInfo unchanged. A lost acknowledgement may have
        // committed; repainting must never invent a failed start or a paid refund.
        if (PromptView.page === 'loading')
            PromptView.setPageView(null);
    }
    if (typeof WenQuanScene !== 'undefined' && WenQuanScene.prototype && typeof WenQuanScene.prototype.send === 'function') {
        var practiceSend = WenQuanScene.prototype.send;
        WenQuanScene.prototype.send = function (command) {
            if (command !== 'practise' && command !== 'endPractise')
                return practiceSend.apply(this, arguments);
            if (practiceAction)
                return;
            var action = { scene: this, command: command, sessionKey: command === 'endPractise' ?
                    (this.__nhPracticeFinishKey !== undefined ? this.__nhPracticeFinishKey : practiceKey) : null };
            delete this.__nhPracticeFinishKey;
            var session = GameConnection.session, send = session && session.send, handedOff = false;
            practiceAction = action;
            this.__nhEconomyDisposed = false;
            var observe = function (event) {
                var result = send.apply(this, arguments);
                if (event && event.source && Object.prototype.hasOwnProperty.call(event.source, command))
                    handedOff = true;
                return result;
            };
            if (typeof send === 'function')
                session.send = observe;
            try {
                return practiceSend.apply(this, arguments);
            }
            finally {
                if (session && session.send === observe)
                    session.send = send;
                if (!handedOff && practiceAction === action) {
                    practiceAction = null;
                    restorePractice(action);
                }
            }
        };
        var removePractice = WenQuanScene.prototype.onRemoveMe;
        if (typeof removePractice === 'function')
            WenQuanScene.prototype.onRemoveMe = function () {
                this.__nhEconomyDisposed = true;
                if (practiceAction && practiceAction.scene === this)
                    practiceAction = null;
                return removePractice.apply(this, arguments);
            };
        //Bind the confirmation to the bath shown when it opened, even if another
        //device starts a different paid course while the dialog remains visible.
        for (var pi = 0, practicePrompts = ['onTouchesEnded', 'cdChange']; pi < practicePrompts.length; pi++)
            (function (name) {
                var original = WenQuanScene.prototype[name];
                if (typeof original !== 'function')
                    return;
                WenQuanScene.prototype[name] = function () {
                    var scene = this, show = PromptView.setPageView;
                    var observe = function (page, options) {
                        if (page === 'tip' && options && options.target === scene && options.fun === 'onTipEndPractise')
                            scene.__nhPracticeFinishKey = practiceKey;
                        return show.apply(this, arguments);
                    };
                    PromptView.setPageView = observe;
                    try {
                        return original.apply(this, arguments);
                    }
                    finally {
                        if (PromptView.setPageView === observe)
                            PromptView.setPageView = show;
                    }
                };
            })(practicePrompts[pi]);
        var renderPractice = WenQuanScene.prototype.myPaoWenquan;
        if (typeof renderPractice === 'function')
            WenQuanScene.prototype.myPaoWenquan = function (animate) {
                var info = PracInfoData.getInstance(), hid = Number(info.hid);
                if ((Number(info.ptype) !== 0 && Number(info.ptype) !== 1) || !RoleData.getInstance().heros[hid])
                    return;
                //2949 refuses to replace an existing armature. Reconcile only the owned
                //bath when a current snapshot changes its ninja; guests stay untouched.
                if (this.myArmature && this.__nhPracticeRenderedHid !== undefined && this.__nhPracticeRenderedHid !== hid) {
                    ArmatureLoad.getInstance().removeTargetList(this.myArmature);
                    this.myArmature.removeArmature();
                    this.myArmature = null;
                }
                var result = renderPractice.call(this, animate, hid);
                if (this.myArmature)
                    this.__nhPracticeRenderedHid = hid;
                return result;
            };
    }
    var sendPracticeMessage = GameConnection.send;
    GameConnection.send = function (command, payload) {
        if (command === 'endPractise' && practiceAction && practiceAction.command === command && typeof practiceAction.sessionKey === 'string') {
            var intended = {};
            for (var key in payload)
                if (Object.prototype.hasOwnProperty.call(payload, key))
                    intended[key] = payload[key];
            intended.sessionKey = practiceAction.sessionKey;
            payload = intended;
        }
        if (command === 'costumeUpgrade') {
            if (costumeRequest)
                return;
            var level = Number(CostumeData.getInstance().getLevel(payload.id));
            var quote = {};
            for (var field in payload)
                if (Object.prototype.hasOwnProperty.call(payload, field))
                    quote[field] = payload[field];
            quote.expectedLevel = level;
            var request = { id: Number(payload.id), expectedLevel: level };
            costumeRequest = request;
            repaintCostumeControls();
            var session = GameConnection.session, transport = session && session.send, handedOff = false;
            var observe = function (event) {
                var result = transport.apply(this, arguments);
                if (event && event.source && event.source.costumeUpgrade === quote)
                    handedOff = true;
                return result;
            };
            if (typeof transport === 'function')
                session.send = observe;
            try {
                return sendPracticeMessage.call(this, command, quote);
            }
            finally {
                if (session && session.send === observe)
                    session.send = transport;
                if (!handedOff && costumeRequest === request) {
                    costumeRequest = null;
                    repaintCostumeControls();
                }
            }
        }
        return sendPracticeMessage.call(this, command, payload);
    };
    function restoreLaboratory(action) {
        if (!action || action.scene.__nhEconomyDisposed)
            return;
        // Recovered2583 starts these indicators before sending. Error packets are
        // consumed by the adapter, so original2580 never gets to hide them.
        action.scene.showMov(false);
        action.scene.setEnabledAll(true);
        //After a handoff,334/335/333 can interrupt without closing2583's modal.
        //Reenable only this live page; retain349's network tip or other-page UI.
        if (MainView.currentPage === action.scene && PromptView.page === 'loading')
            PromptView.setPageView(null);
    }
    if (typeof ShiYanShiScene !== 'undefined' && ShiYanShiScene.prototype && typeof ShiYanShiScene.prototype.send === 'function') {
        var laboratorySend = ShiYanShiScene.prototype.send;
        ShiYanShiScene.prototype.send = function () {
            if (laboratory)
                return;
            var roleData = RoleData.getInstance(), target = Number(this.tarId), levelBefore = 0;
            if (target > 0 && roleData.heros && roleData.heros[target] && typeof roleData.getLv === 'function')
                levelBefore = Number(roleData.getLv(target));
            var action = { scene: this, mode: Number(ExchangeData.getInstance().setIdx), target: this.tarId,
                levelBefore: levelBefore };
            var session = GameConnection.session, send = session && session.send, handedOff = false;
            laboratory = action;
            this.__nhEconomyDisposed = false;
            var observe = function (event) {
                var result = send.apply(this, arguments);
                if (event && event.source && event.source.exchange)
                    handedOff = true;
                return result;
            };
            if (typeof send === 'function')
                session.send = observe;
            try {
                return laboratorySend.apply(this, arguments);
            }
            finally {
                if (session && session.send === observe)
                    session.send = send;
                // Actual341 returns silently without a session, and catches send
                // exceptions. A buffered handoff remains pending until a real result.
                if (!handedOff && laboratory === action) {
                    laboratory = null;
                    restoreLaboratory(action);
                }
            }
        };
        var laboratoryResult = ShiYanShiScene.prototype.onChangeOperResult;
        if (typeof laboratoryResult === 'function')
            ShiYanShiScene.prototype.onChangeOperResult = function () {
                var action = laboratory, operation = OperResultData.getInstance();
                if (!action || action.scene !== this || this.__nhEconomyDisposed || action.mode !== 0 ||
                    Number(ExchangeData.getInstance().setIdx) !== 0 || action.target !== this.tarId ||
                    Number(operation.type) !== 6 || Number(operation.res) !== 0)
                    return laboratoryResult.apply(this, arguments);
                var level = Number(RoleData.getInstance().getLv(this.tarId));
                if (!(action.levelBefore > 0 && level <= action.levelBefore))
                    return laboratoryResult.apply(this, arguments);
                //2580 guesses a level-up from remaining EXP<=granted EXP. Grade-only
                //absorption at0EXP can therefore announce "Upgrade to level1/150".
                //Keep its complete success flow; remove only that false level clause.
                var format = Config.getInstance().textObject[3047], notice = PromptBox.getInstance(), show = notice.updataTxt;
                if (typeof format !== 'string' || typeof show !== 'function')
                    return laboratoryResult.apply(this, arguments);
                var clause = ',' + format.replace(/\{0\}/g, String(level));
                var truthful = function (text) {
                    if (typeof text === 'string')
                        arguments[0] = text.replace(clause, '');
                    return show.apply(this, arguments);
                };
                notice.updataTxt = truthful;
                try {
                    return laboratoryResult.apply(this, arguments);
                }
                finally {
                    if (notice.updataTxt === truthful)
                        notice.updataTxt = show;
                }
            };
        var removeLaboratory = ShiYanShiScene.prototype.onRemoveMe;
        if (typeof removeLaboratory === 'function')
            ShiYanShiScene.prototype.onRemoveMe = function () {
                this.__nhEconomyDisposed = true;
                if (laboratory && laboratory.scene === this)
                    laboratory = null;
                return removeLaboratory.apply(this, arguments);
            };
    }
    function sameEquipment(a, b) {
        return !!a && !!b && Number(a.c || 0) === Number(b.c || 0) && Number(a.idx) === Number(b.idx) &&
            (Number(a.c || 0) !== 0 || Number(a.hid) === Number(b.hid)) && Number(a.id) === Number(b.id);
    }
    function refreshForge(action) {
        var scene = action.scene, view = scene.viewLabel;
        if (scene.__nhEconomyDisposed || !view)
            return;
        var selected = scene.currData;
        scene.refreshViewTable();
        var list = view.list || [], index = -1;
        for (var i = 0; i < list.length; i++)
            if (sameEquipment(list[i], selected)) {
                index = i;
                break;
            }
        if (index < 0)
            index = Math.max(0, Math.min(action.index, list.length - 1));
        InventoryData.getInstance().eidx = index;
        view.runMove_CENTER(index);
        scene.table_call_fun({ data: list[index], idx: index });
    }
    if (typeof EnhanceScene !== 'undefined' && EnhanceScene.prototype) {
        // Original2444 splices the visible list immediately. Keep its effect and
        // request, but let the actual removal delta decide when the row disappears.
        EnhanceScene.prototype.decomposeItem = function () {
            if (decomposition)
                return;
            var selected = this.currData, list = this.viewLabel && this.viewLabel.list;
            if (!selected || !list || list.indexOf(selected) < 0)
                return;
            var payload = { c: selected.c || 0, idx: selected.idx };
            if (selected.hid !== undefined)
                payload.hid = selected.hid;
            var action = { scene: this, c: Number(payload.c), idx: Number(payload.idx), hid: Number(payload.hid), index: list.indexOf(selected) };
            decomposition = forgeView = action;
            this.__nhEconomyDisposed = false;
            // Recovered341 returns undefined on both success and a silent no-session
            // return, and catches transport errors itself. Observe actual handoff;
            // a normal-returning socket/transport queue counts as sent, not as an ACK.
            var session = GameConnection.session, send = session && session.send, handedOff = false;
            var observe = function (event) {
                var result = send.apply(this, arguments);
                if (event && event.source && event.source.decomposeItem === payload)
                    handedOff = true;
                return result;
            };
            if (typeof send === 'function')
                session.send = observe;
            try {
                this.addItemEffect();
                return GameConnection.send('decomposeItem', payload);
            }
            finally {
                if (session && session.send === observe)
                    session.send = send;
                if (!handedOff && decomposition === action)
                    decomposition = null;
            }
        };
        var removeForge = EnhanceScene.prototype.onRemoveMe;
        if (typeof removeForge === 'function')
            EnhanceScene.prototype.onRemoveMe = function () {
                this.__nhEconomyDisposed = true;
                if (decomposition && decomposition.scene === this)
                    decomposition = null;
                if (forgeView && forgeView.scene === this)
                    forgeView = null;
                return removeForge.apply(this, arguments);
            };
    }
    function costumePercentages(scene, id) {
        var definition = Config.getInstance().costmueObject[id], labels = scene.costmueProps && scene.costmueProps.controller;
        if (!definition || !labels)
            return;
        var level = Math.max(1, Number(CostumeData.getInstance().getLevel(id)) || 0);
        var keys = ['att', 'def', 'hp', 'agi'], names = ['atkp', 'defp', 'hpp', 'agip'];
        for (var i = 0; i < keys.length; i++)
            if (labels[names[i]])
                labels[names[i]].setString('+' +
                    (Number(definition[keys[i]] || 0) + (level - 1) * Number(definition[keys[i] + 'up'] || 0)) + '%');
    }
    function fragmentButton(button) {
        if (!button)
            return null;
        // btn_buy.png contains baked USD4.99 pixels. Replace only this sprite's
        // frame, retaining its original world-size, anchor, parent and touch node.
        if (!button.__nhFragmentLabel) {
            if (typeof cc === 'undefined' || !cc.SpriteFrameCache || !cc.LabelTTF || !button.setDisplayFrame) {
                button.setVisible(false);
                return null;
            }
            var frame = cc.SpriteFrameCache.getInstance().getSpriteFrame('image/ibutton/btn_box_h.png');
            if (!frame) {
                button.setVisible(false);
                return null;
            }
            var oldSize = button.getContentSize(), scaleX = button.getScaleX(), scaleY = button.getScaleY();
            button.setDisplayFrame(frame);
            var size = button.getContentSize();
            button.setScaleX(scaleX * oldSize.width / size.width);
            button.setScaleY(scaleY * oldSize.height / size.height);
            var label = cc.LabelTTF.create('', 'Helvetica', 18);
            label.setDimensions(cc.size(size.width - 16, 0));
            label.setHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
            label.setColor(cc.c3b(55, 35, 0));
            label.setPosition(cc.p(size.width / 2, size.height / 2));
            button.addChild(label, 1);
            button.__nhFragmentLabel = label;
        }
        return button.__nhFragmentLabel;
    }
    function costumeAction(scene) {
        var button = scene.costumeBuyBtn, definition = Config.getInstance().costmueObject[scene.currentKey];
        if (!fragmentButton(button))
            return;
        // Recovered getLevel880 returns1 even when unowned; ownership is separate.
        var owned = CostumeData.getInstance().isHave(scene.currentKey);
        var level = owned ? Number(CostumeData.getInstance().getLevel(scene.currentKey)) || 1 : 0;
        // Tombol Upgrade / Max level dihapus: costume yang sudah dimiliki tidak menampilkan tombol apa pun.
        // (Tombol hanya muncul sebagai "Unlock" untuk costume yang belum dimiliki.)
        if (owned) {
            button._ty = 'costumeWaiting';
            button.setVisible(false);
            return;
        }
        var maximum = costumeRules && Number(costumeRules.maximumLevel);
        var cost = costumeRules && Number(level ? costumeRules.upgradeMaterialCosts[level] : (costumeRules.unlockGoldCost || 1500));
        var capped = maximum > 0 && level >= maximum;
        var ready = !!definition && !!costumeRules && (capped || isFinite(cost) && cost > 0 && Math.floor(cost) === cost);
        if (ready && level && !capped && costumeRequest) {
            button._ty = 'costumeWaiting';
            button.__nhFragmentLabel.setString(Number(scene.currentKey) === costumeRequest.id ? 'Upgrading...' : 'Please wait');
            button.setVisible(true);
            return;
        }
        button._ty = !ready ? 'costumeWaiting' : capped ? 'costumeMax' : level ? 'upgradeBtn' : 'costumeBuyBtn';
        button.__nhFragmentLabel.setString(!ready ? '' : capped ? 'Max level\nLv ' + level : (level ? 'Upgrade' : 'Unlock') + '\n' + cost + (level ? ' fragments' : ' gold'));
        button.setVisible(ready);
        // The CCB's separate upgradeBtn is hidden and was never in createMenu3355's
        // touch list. The existing bottom action instead reaches actual3370→3369.
    }
    if (typeof CostumeScene !== 'undefined' && CostumeScene.prototype) {
        var costumeChanged = CostumeScene.prototype.onChangeCostumeData;
        CostumeScene.prototype.onChangeCostumeData = function () {
            var result = costumeChanged && costumeChanged.apply(this, arguments);
            if (this.currentKey !== null && this.currentKey !== undefined) {
                this.updateCostmueArrt();
                costumePercentages(this, this.currentKey);
            }
            costumeAction(this);
            return result;
        };
        for (var costumeHook = 0, costumeHooks = ['createMenu', 'updateCostumeInfo']; costumeHook < costumeHooks.length; costumeHook++)
            (function (name) {
                var original = CostumeScene.prototype[name];
                if (typeof original === 'function')
                    CostumeScene.prototype[name] = function () {
                        var result = original.apply(this, arguments);
                        costumeAction(this);
                        return result;
                    };
            })(costumeHooks[costumeHook]);
    }
    if (typeof GainItemScene !== 'undefined' && GainItemScene.prototype && typeof GainItemScene.prototype.initUI === 'function') {
        var gainItemUI = GainItemScene.prototype.initUI;
        GainItemScene.prototype.initUI = function () {
            var result = gainItemUI.apply(this, arguments);
            // GainItemCCB1 has an unbounded 22pt label inside a 350-wide panel.
            // Multi-item CCB already uses bounded 120x44 labels; leave that grid alone.
            var label = this.length === 1 && this.scene && this.scene.controller.alt0;
            if (label && label.getContentSize().width > 300 && typeof label.setDimensions === 'function') {
                var before = label.getContentSize(), top = label.getPositionY() + before.height / 2;
                label.setDimensions(cc.size(300, 0));
                label.setHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
                label.setAnchorPoint(cc.p(0.5, 1));
                label.setPositionY(top);
                // Keep the complete name and quantity. Only unusually tall wrapped
                // text needs a smaller font; short labels/OK/IgnoreAll remain original.
                var font = label.getFontSize();
                while (label.getContentSize().height > 112 && font > 12) {
                    font -= 2;
                    label.setFontSize(font);
                }
                var measured = label.getContentSize();
                if (measured.height > 112 || measured.width > 300)
                    label.setScale(Math.min(112 / measured.height, 300 / measured.width));
            }
            return result;
        };
    }
    if (typeof ZhuangBeiScene !== 'undefined' && ZhuangBeiScene.prototype) {
        var detailCostumeInfo = ZhuangBeiScene.prototype.updateCostumeInfo;
        if (typeof detailCostumeInfo === 'function')
            ZhuangBeiScene.prototype.updateCostumeInfo = function () {
                var result = detailCostumeInfo.apply(this, arguments), ids = Config.getInstance().getCostumeByRoleIdx(this.currentKey);
                var id = ids && ids[0], button = this.costumeBuyBtn;
                if (!id || !button || CostumeData.getInstance().isHave(id))
                    return result;
                var label = fragmentButton(button), cost = costumeRules && Number(costumeRules.unlockGoldCost || 1500);
                var ready = !!label && isFinite(cost) && cost > 0 && Math.floor(cost) === cost;
                if (label)
                    label.setString(ready ? 'Unlock\n' + cost + ' gold' : '');
                button.setVisible(ready);
                button._ty = ready ? 'costumeBuyBtn' : 'costumeWaiting';
                return result;
            };
        var ninjaCostumePreview = ZhuangBeiScene.prototype.updateCostmueArrt;
        ZhuangBeiScene.prototype.updateCostmueArrt = function () {
            var result = ninjaCostumePreview && ninjaCostumePreview.apply(this, arguments);
            var ids = Config.getInstance().getCostumeByRoleIdx(this.currentKey);
            if (ids && ids.length)
                costumePercentages(this, ids[0]);
            return result;
        };
    }
    if (typeof WaBaoScene !== 'undefined' && WaBaoScene.prototype) {
        var treasureCooldown = WaBaoScene.prototype.cdChange;
        WaBaoScene.prototype.cdChange = function () {
            var result = treasureCooldown.apply(this, arguments), buildings = BuildData.getInstance();
            var limit = treasureRules ? treasureRules.freeRounds : Number(buildings.gratisFrequency(4, 0));
            var cost = treasureRules ? treasureRules.paidGold : Number(buildings.getFuncCost(4, 0).count);
            var remaining = Math.max(0, Math.min(limit, Number(buildings.getNum(4)) || 0));
            var cooldown = Math.max(0, Number(buildings.getCD_Idx(4, 0)) || 0);
            var quota = 'Free today: ' + remaining + '/' + limit;
            if (treasureRound && this.__nhTreasureRetry) {
                this.kaishiwabaoSHowButton.showTF(false);
                this.numTF.setString('Claim ready: tap Start to retry | No extra cost');
            }
            else if (treasureRound) {
                this.kaishiwabaoSHowButton.showTF(false);
                this.numTF.setString('Resume: no extra cost | Free: ' + remaining + '/' + limit);
            }
            else if (remaining === 0)
                this.numTF.setString(quota + ' | Play: ' + cost + ' gold');
            else
                this.numTF.setString(quota + (cooldown > 0 ? ' | Free in ' + GameTools.getInstance().getTimes(cooldown) : ' | Ready'));
            return result;
        };
    }
    var receive = GameConnection.onmessage;
    GameConnection.onmessage = function (message) {
        // Retain the complete snapshot in recovered345's buffer. In particular a
        // Whack settlement cannot reveal rewards before its inventory is applied.
        if (message && (message.treasureRules || message.practiceRules || message.costumeRules) && GameConnection.networkInstableState && !message.recoveryError)
            return receive.call(this, message);
        if (message && message.chatReset) {
            restoreLaboratory(laboratory);
            laboratory = null;
            restorePractice(practiceAction);
            practiceAction = null;
            decomposition = forgeView = null;
            treasureRules = treasureRound = costumeRules = null;
            practiceKey = null;
            costumeRequest = null;
        }
        if (message && message.practiceRules) {
            var currentPractice = message.practiceRules.current;
            practiceKey = currentPractice && typeof currentPractice.sessionKey === 'string' ? currentPractice.sessionKey : null;
        }
        if (message && message.costumeRules) {
            var incomingCostume = message.costumeRules;
            costumeRules = incomingCostume && Object.prototype.toString.call(incomingCostume.upgradeMaterialCosts) === '[object Array]' ? incomingCostume : null;
        }
        if (message && message.treasureRules) {
            var rules = message.treasureRules;
            if (typeof rules.freeRounds === 'number' && isFinite(rules.freeRounds) && rules.freeRounds >= 0 &&
                typeof rules.paidGold === 'number' && isFinite(rules.paidGold) && rules.paidGold >= 0)
                treasureRules = { freeRounds: rules.freeRounds, paidGold: rules.paidGold };
            treasureRound = rules.currentRound && typeof rules.currentRound.id === 'string' ? rules.currentRound : null;
        }
        var action = decomposition, labAction = laboratory, bathAction = practiceAction, outfitAction = costumeRequest, removed = false, equipmentRemoved = false;
        var buffered = GameConnection.networkInstableState && message && !message.recoveryError;
        if (message && message.inventory && message.inventory.itemList) {
            var changes = message.inventory.itemList;
            for (var i = 0; i < changes.length; i++) {
                var change = changes[i];
                if ((Number(change.c) === 0 || Number(change.c) === 1) && !change.id)
                    equipmentRemoved = true;
                if (action && Number(change.c) === action.c && Number(change.idx) === action.idx &&
                    (action.c !== 0 || Number(change.hid) === action.hid) && !change.id)
                    removed = true;
            }
        }
        var result = receive.call(this, message);
        // An unrelated equip operation42 (or read snapshot) is not this paid
        // upgrade's ACK. Whole-packet buffering must retain the quote until apply.
        var costumeResult = message && message.operResult, ownedCostume = outfitAction && message && message.costume && message.costume[outfitAction.id];
        if (!buffered && outfitAction && costumeRequest === outfitAction && message && (message.recoveryError ||
            Number(costumeResult && costumeResult.type) === 42 && Number(costumeResult.param) === outfitAction.id &&
                (Number(costumeResult.res) !== 0 || ownedCostume && Number(ownedCostume.lv) > outfitAction.expectedLevel))) {
            costumeRequest = null;
            repaintCostumeControls();
            if (message.recoveryError && message.recoveryError.code === 'COSTUME_CHANGED')
                GameConnection.send('requestCostumes', 1);
        }
        // Keep the original success callback/animation intact. Other successful
        // operations cannot acknowledge an exchange. Modern rejection packets use
        // generic operation0, so recoveryError releases only this local busy UI.
        if (!buffered && labAction && laboratory === labAction && message && (message.recoveryError || Number(message.operResult && message.operResult.type) === 6)) {
            laboratory = null;
            if (message.recoveryError || Number(message.operResult.res) !== 0)
                restoreLaboratory(labAction);
        }
        if (!buffered && bathAction && practiceAction === bathAction && message && (message.recoveryError ||
            Number(message.operResult && message.operResult.type) === (bathAction.command === 'practise' ? 8 : 9))) {
            practiceAction = null;
            if (message.recoveryError || Number(message.operResult.res) !== 0)
                restorePractice(bathAction);
            if (message.recoveryError && (message.recoveryError.code === 'PRACTICE_CHANGED' || message.recoveryError.code === 'NO_PRACTICE') &&
                !bathAction.scene.__nhEconomyDisposed && MainView.currentPage === bathAction.scene)
                GameConnection.send('openBuild', { id: 6 });
        }
        if (message && (message.costumeRules || message.chatReset) && typeof ContentView !== 'undefined' && ContentView.currentPage &&
            typeof CostumeScene !== 'undefined' && ContentView.currentPage instanceof CostumeScene)
            costumeAction(ContentView.currentPage);
        // Operation0 is shared by unrelated actions; only the selected equipment's
        // authoritative tombstone commits this visual transition. Errors retain it.
        if (!buffered && action && decomposition === action && message && (message.recoveryError || removed)) {
            decomposition = null;
        }
        // A late accepted response still owns inventory even if connection failure
        // released the busy guard. Rebuild its live scene without retrying anything.
        if (!buffered && forgeView && (equipmentRemoved || action && message && message.recoveryError))
            refreshForge(forgeView);
        if (message && (message.treasureRules || message.chatReset) && typeof MainView !== 'undefined') {
            var page = MainView.currentPage;
            if (page && Number(page.buildingID) === 4 && typeof page.cdChange === 'function')
                page.cdChange();
        }
        return result;
    };
    for (var index = 0, lifecycle = ['onclose', 'onerror', 'sessionClose', 'reconnect', 'login']; index < lifecycle.length; index++)
        (function (name) {
            var original = GameConnection[name];
            if (typeof original === 'function')
                GameConnection[name] = function () {
                    // This cancels only a local busy guard. No item is restored, transaction
                    // declared failed, or command retried; later authoritative deltas win.
                    decomposition = null;
                    restoreLaboratory(laboratory);
                    laboratory = null;
                    restorePractice(practiceAction);
                    practiceAction = null;
                    costumeRequest = null;
                    repaintCostumeControls();
                    return original.apply(this, arguments);
                };
        })(lifecycle[index]);
    GameConnection.__nhEconomyClientFixes = true;
}

"use strict";
function __NH_INSTALL_SOCIAL_CLIENT_FIXES() {
    __NH_INSTALL_FRIEND_TARGET_FIXES();
    __NH_INSTALL_MAIL_PANEL_FIXES();
    __NH_INSTALL_MAIL_REPLY_FIXES();
    if (typeof ChatLabel === 'undefined' || !ChatLabel.prototype || ChatLabel.prototype.__nhStableAuthor)
        return;
    var update = ChatLabel.prototype.updatas, click = ChatLabel.prototype.onMenuCallbackDisabled;
    if (typeof update !== 'function' || typeof click !== 'function')
        return;
    ChatLabel.prototype.updatas = function (message) {
        var id = message && Number(message.messageId);
        this.__nhChatMessageId = message && (message.scope === 1 || message.scope === 3) && isFinite(id) && id > 0 && Math.floor(id) === id ? id : null;
        if (!message)
            this.enableds = false;
        return update.apply(this, arguments);
    };
    ChatLabel.prototype.onMenuCallbackDisabled = function () {
        var id = this.__nhChatMessageId, send = GameConnection.send;
        if (!id)
            return click.apply(this, arguments);
        GameConnection.send = function (command, payload) {
            if (command === 'showPlayer')
                return send.call(this, command, { chatMessageId: id });
            return send.apply(this, arguments);
        };
        try {
            return click.apply(this, arguments);
        }
        finally {
            GameConnection.send = send;
        }
    };
    ChatLabel.prototype.__nhStableAuthor = true;
}
/** A visible popup outlives name changes and list refreshes. Keep the public
 * numeric player identity carried in the optional tuple tail, never a name map. */
function __NH_INSTALL_FRIEND_TARGET_FIXES() {
    if (typeof FriendTip === 'undefined' || !FriendTip.prototype)
        return;
    var p = FriendTip.prototype;
    if (p.__nhStableTarget || typeof p.updata !== 'function')
        return;
    var update = p.updata;
    p.updata = function (data) {
        var meta = data && data[8], id = meta && Number(meta.targetId);
        this.__nhTargetId = isFinite(id) && id > 0 && Math.floor(id) === id ? id : null;
        if (meta && meta.rowType === 'friend') {
            // FriendBox uses costume at6 and rank/clan at4/5; FriendTip expects the
            // short-profile tuple. The original page passes the friend row unchanged.
            var args = [];
            for (var i = 0; i < arguments.length; i++)
                args.push(arguments[i]);
            args[0] = [data[0], data[1], data[2], data[3], data[6], meta.qlv || 0, data[4], data[5], { targetId: id, rowType: 'short' }];
            return update.apply(this, args);
        }
        return update.apply(this, arguments);
    };
    function bind(method) {
        var original = p[method];
        if (typeof original !== 'function')
            return;
        p[method] = function () {
            var id = this.__nhTargetId, send = GameConnection.send;
            if (!id)
                return original.apply(this, arguments);
            GameConnection.send = function (command, payload) {
                if (command === 'operFriend' || command === 'friendInfo') {
                    var next = {};
                    for (var key in payload)
                        if (Object.prototype.hasOwnProperty.call(payload, key))
                            next[key] = payload[key];
                    next.targetId = id;
                    return send.call(this, command, next);
                }
                return send.apply(this, arguments);
            };
            try {
                return original.apply(this, arguments);
            }
            finally {
                GameConnection.send = send;
            }
        };
    }
    bind('send');
    bind('redirectToPlayerInfo');
    if (typeof p.redirectToMailBox === 'function') {
        var letter = p.redirectToMailBox;
        p.redirectToMailBox = function () {
            var id = this.__nhTargetId, open = PromptView.setPageView;
            PromptView.setPageView = function (page, data) {
                if (page === 'letter' && data && id) {
                    var next = {};
                    for (var key in data)
                        if (Object.prototype.hasOwnProperty.call(data, key))
                            next[key] = data[key];
                    next.targetId = id;
                    return open.call(this, page, next);
                }
                return open.apply(this, arguments);
            };
            try {
                return letter.apply(this, arguments);
            }
            finally {
                PromptView.setPageView = open;
            }
        };
    }
    p.__nhStableTarget = true;
}
/** Inbox indices are presentation positions, not action targets. Keep the
 * selected server ID through full snapshots, and leave deletion to the ACK. */
function __NH_INSTALL_MAIL_PANEL_FIXES() {
    if (typeof EmailInbox === 'undefined' || !EmailInbox.prototype)
        return;
    var p = EmailInbox.prototype;
    if (p.__nhStableMailPanel || typeof p.initUI !== 'function' || typeof p.selectTarget !== 'function' || typeof p.onChange !== 'function' ||
        typeof p.readMail !== 'function' || typeof p.sendRemoveMail !== 'function' || typeof p.onTouchesEnded !== 'function')
        return;
    var init = p.initUI, select = p.selectTarget, change = p.onChange, read = p.readMail, touch = p.onTouchesEnded, begin = p.onTouchesBegan, cancel = p.onTouchesCancelled, remove = p.onRemoveMe;
    function list(panel) {
        var model = EmailData.getInstance(), rows = panel.tabType === 2 ? model.priMails : model.sysMails;
        if (panel.emailViewLabel)
            panel.emailViewLabel.list = rows;
        return rows || [];
    }
    function current(panel) { return list(panel)[EmailData.getInstance().currSelectIdx]; }
    function identity(panel) {
        var mail = current(panel);
        return mail && mail.id ? panel.tabType + ':' + mail.id : '';
    }
    function remember(panel) { panel.__nhSelectedMail = identity(panel); }
    function reconcile(panel) {
        var rows = list(panel), model = EmailData.getInstance(), index = model.currSelectIdx, selected = panel.__nhSelectedMail;
        for (var i = 0; i < rows.length; i++)
            if (panel.tabType + ':' + rows[i].id === selected) {
                index = i;
                break;
            }
        if (!rows.length)
            index = -1;
        else if (typeof index !== 'number' || !isFinite(index) || index < 0)
            index = 0;
        else
            index = Math.min(Math.floor(index), rows.length - 1);
        model.currSelectIdx = index;
        remember(panel);
    }
    function sendDelete(panel, tab, id, epoch) {
        if (panel.__nhMailClosed || panel.__nhMailEpoch !== epoch)
            return;
        var model = EmailData.getInstance(), rows = tab === 2 ? model.priMails : model.sysMails, exists = false;
        for (var i = 0; i < rows.length; i++)
            if (Number(rows[i].id) === id) {
                exists = true;
                break;
            }
        if (!exists) {
            PromptView.setPageView(null);
            return;
        }
        PromptView.setPageView('loading');
        // Never splice the model before a server response. Rejection/retry keeps the
        // same mail visible, and a confirmed delete cannot target a replacement row.
        return GameConnection.send('removeMail', { tab: tab, id: id });
    }
    p.initUI = function () {
        this.__nhMailClosed = false;
        this.__nhMailEpoch = (this.__nhMailEpoch || 0) + 1;
        this.__nhMailTouch = null;
        this.__nhSelectedMail = null;
        reconcile(this);
        return init.apply(this, arguments);
    };
    p.selectTarget = function (index) {
        var rows = list(this);
        index = rows.length ? Math.max(0, Math.min(isFinite(index) ? Math.floor(index) : 0, rows.length - 1)) : -1;
        EmailData.getInstance().currSelectIdx = index;
        remember(this);
        return select.call(this, index);
    };
    p.readMail = function () {
        var mail = current(this);
        remember(this);
        // Original4124 sends an undefined ID on an empty/removed selection and reads
        // already-read mail every time the panel opens. Only unread rows need an ACK.
        if (!mail || !mail.id || Number(mail.n) !== 1)
            return;
        return read.apply(this, arguments);
    };
    p.onChange = function () {
        if (this.__nhMailClosed)
            return;
        var previous = this.__nhSelectedMail;
        reconcile(this);
        var rows = list(this), result = change.apply(this, arguments);
        // Original4118 only reloads titles when the last row is unread. Claims and
        // read receipts must also update their visible title badges.
        if (!rows.length || Number(rows[rows.length - 1].n) !== 1)
            this.emailViewLabel.reloadData();
        if (!rows.length && this.timeTF)
            this.timeTF.setString('');
        if (previous !== this.__nhSelectedMail)
            this.readMail();
        return result;
    };
    p.sendRemoveMail = function () {
        var mail = current(this);
        if (mail && mail.id)
            return sendDelete(this, this.tabType, Number(mail.id), this.__nhMailEpoch);
    };
    if (typeof begin === 'function')
        p.onTouchesBegan = function () {
            var result = begin.apply(this, arguments), kind = this.touchCurTarget && this.touchCurTarget._ty;
            this.__nhMailTouch = kind === 'take' || kind === 'del' || (kind === 'write' && this.tabType === 2) ? identity(this) : null;
            return result;
        };
    p.onTouchesEnded = function () {
        var panel = this, kind = this.touchCurTarget && this.touchCurTarget._ty, mail = current(this), pressed = this.__nhMailTouch;
        this.__nhMailTouch = null;
        if ((pressed !== null && typeof pressed !== 'undefined' && pressed !== identity(this)) ||
            ((kind === 'take' || kind === 'del') && (!mail || !mail.id)) ||
            (kind === 'take' && (!mail.w || Number(mail.n) === 3))) {
            if (typeof cancel === 'function')
                cancel.call(this);
            return;
        }
        var id = mail && Number(mail.id), tab = this.tabType, epoch = this.__nhMailEpoch, open = PromptView.setPageView;
        PromptView.setPageView = function (page, data) {
            if (page === 'tip' && data && data.target === panel && data.fun === 'sendRemoveMail' && id) {
                var next = {};
                for (var key in data)
                    if (Object.prototype.hasOwnProperty.call(data, key))
                        next[key] = data[key];
                var consumed = false;
                next.target = { sendRemoveMail: function () {
                        if (consumed)
                            return;
                        consumed = true;
                        return sendDelete(panel, tab, id, epoch);
                    } };
                return open.call(this, page, next);
            }
            return open.apply(this, arguments);
        };
        try {
            return touch.apply(this, arguments);
        }
        finally {
            PromptView.setPageView = open;
        }
    };
    if (typeof remove === 'function')
        p.onRemoveMe = function () {
            this.__nhMailClosed = true;
            this.__nhMailTouch = null;
            return remove.apply(this, arguments);
        };
    p.__nhStableMailPanel = true;
}
function __NH_INSTALL_MAIL_REPLY_FIXES() {
    if (typeof EmailInbox !== 'undefined' && EmailInbox.prototype && typeof EmailInbox.prototype.onTouchesEnded === 'function' && !EmailInbox.prototype.__nhStableReply) {
        var touch = EmailInbox.prototype.onTouchesEnded;
        EmailInbox.prototype.onTouchesEnded = function () {
            var selected = this.tabType === 2 && this.emailViewLabel && this.emailViewLabel.list && this.emailViewLabel.list[EmailData.getInstance().currSelectIdx];
            var id = selected && Number(selected.id), open = PromptView.setPageView;
            PromptView.setPageView = function (page, data) {
                if (page === 'letter' && data && selected && isFinite(id) && id > 0 && Math.floor(id) === id) {
                    var next = {};
                    for (var key in data)
                        if (Object.prototype.hasOwnProperty.call(data, key))
                            next[key] = data[key];
                    next.replyToMailId = id;
                    return open.call(this, page, next);
                }
                return open.apply(this, arguments);
            };
            try {
                return touch.apply(this, arguments);
            }
            finally {
                PromptView.setPageView = open;
            }
        };
        EmailInbox.prototype.__nhStableReply = true;
    }
    if (typeof EmailWriteLetter !== 'undefined' && EmailWriteLetter.prototype && typeof EmailWriteLetter.prototype.initUI === 'function' && typeof EmailWriteLetter.prototype.onTouchesEnded === 'function' && !EmailWriteLetter.prototype.__nhStableReply) {
        var init = EmailWriteLetter.prototype.initUI, sendTouch = EmailWriteLetter.prototype.onTouchesEnded;
        EmailWriteLetter.prototype.initUI = function (data) {
            var id = data && Number(data.replyToMailId);
            this.__nhReplyToMailId = data && isFinite(id) && id > 0 && Math.floor(id) === id ? id : null;
            var target = data && Number(data.targetId);
            this.__nhTargetId = data && isFinite(target) && target > 0 && Math.floor(target) === target ? target : null;
            this.__nhReplyName = data && data.name;
            var result = init.apply(this, arguments);
            // Legacy4151 caps names at10, while player naming supports12 (mail lookup32).
            // Restore a prefilled name after raising the cap; native setText may truncate.
            if (this.inputbox && typeof this.inputbox.setMaxLength === 'function')
                this.inputbox.setMaxLength(32);
            if (data && data.name && this.inputbox && typeof this.inputbox.setText === 'function')
                this.inputbox.setText(data.name);
            return result;
        };
        EmailWriteLetter.prototype.onTouchesEnded = function () {
            var id = this.__nhReplyToMailId, target = this.__nhTargetId, name = this.__nhReplyName, send = GameConnection.send;
            GameConnection.send = function (command, payload) {
                // Editing the addressee explicitly switches to an ordinary direct letter.
                if (command === 'sendMail' && id && payload && payload.name === name)
                    return send.call(this, command, { name: payload.name, text: payload.text, replyToMailId: id });
                if (command === 'sendMail' && target && payload && payload.name === name)
                    return send.call(this, command, { name: payload.name, text: payload.text, targetId: target });
                return send.apply(this, arguments);
            };
            try {
                return sendTouch.apply(this, arguments);
            }
            finally {
                GameConnection.send = send;
            }
        };
        EmailWriteLetter.prototype.__nhStableReply = true;
    }
}

"use strict";
function __NH_INSTALL_CAPTURE_CLIENT_FIXES() {
    if (typeof ZhuaRenZheHelp !== 'undefined' && ZhuaRenZheHelp.prototype &&
        typeof ZhuaRenZheHelp.prototype.buildUI === 'function' && !ZhuaRenZheHelp.prototype.__nhCaptureRulesLayout) {
        var buildRules = ZhuaRenZheHelp.prototype.buildUI;
        ZhuaRenZheHelp.prototype.buildUI = function () {
            var result = buildRules.apply(this, arguments), children = this.getChildren();
            //1654 creates one background and one fixed-height label. Preserve its
            //authoritative period/reward text, but remove the native 410px clip.
            if (!children || children.length !== 2 || typeof children[1].getString !== 'function')
                return result;
            var background = children[0], body = children[1], lines = String(body.getString()).split('\n');
            if (lines.length < 3)
                return result;
            var rules = lines[1]
                .replace('Premium captures at Ninja Hut and Special Claw Crane earn 298 points per ninja, including a free premium capture.', 'Premium Ninja Hut + Special Claw Crane:\n298 points/ninja (free premium included).')
                .replace(' A ten-capture action earns 2980.', '\nTen captures: 2980 points.')
                .replace(' Basic captures, tutorial captures and the 50-draw bonus give no points.', '\nNo points: Basic, tutorial or 50-draw bonus.')
                .replace(' Reach 3000 points to enter the top-ten ranking.', '\nTop 10: at least 3000 points.')
                .replace(' Ties favor the earlier time of reaching the final score.', '\nTie: first to reach the final score wins.')
                .replace(' Rewards arrive by mail after the weekly event closes on Wednesday at 00:00 WIB.', '\nEnds Wed 00:00 WIB; rewards mailed.');
            var width = Math.min(640, GameTools.getInstance().sceneSize.width - 24), column = (width - 36) / 2;
            body.setString(rules);
            body.setFontSize(15);
            body.setDimensions(cc.size(column, 0));
            body.setPosition(12, -42);
            var title = cc.LabelTTF.create(lines[0], pFont0, 16, cc.size(width - 24, 0), cc.TEXT_ALIGNMENT_LEFT);
            var rewards = cc.LabelTTF.create(lines.slice(2).join('\n'), pFont0, 15, cc.size(column, 0), cc.TEXT_ALIGNMENT_LEFT);
            title.setAnchorPoint(cc.p(0, 1));
            title.setColor(cc.BLACK);
            title.setPosition(12, -10);
            this.addChild(title);
            rewards.setAnchorPoint(cc.p(0, 1));
            rewards.setColor(cc.BLACK);
            rewards.setPosition(width / 2 + 6, -42);
            this.addChild(rewards);
            var height = Math.max(body.getContentSize().height, rewards.getContentSize().height) + 54;
            background.setContentSize(cc.size(width, height));
            background.setOpacity(245);
            this.__nhCaptureRules = { width: width, height: height };
            return result;
        };
        ZhuaRenZheHelp.prototype.__nhCaptureRulesLayout = true;
    }
    if (typeof NinJaRoomScene !== 'undefined' && NinJaRoomScene.prototype &&
        typeof NinJaRoomScene.prototype.createMenu === 'function' && !NinJaRoomScene.prototype.__nhCaptureRulesLayout) {
        var room = NinJaRoomScene.prototype, createMenu = room.createMenu, frames = room.onFrames;
        var hideDecorativeBubble = function (scene) {
            var panel = scene && scene.zhuarenzheHelpArea;
            if (panel && panel.__nhCaptureRules && panel.isVisible() && scene.ninJaRoomBubble)
                scene.ninJaRoomBubble.setVisible(false);
        };
        room.createMenu = function () {
            var result = createMenu.apply(this, arguments), panel = this.zhuarenzheHelpArea;
            if (panel && panel.__nhCaptureRules) {
                panel.setPosition(GameTools.getInstance().sceneSize.width - panel.__nhCaptureRules.width - 12, panel.__nhCaptureRules.height + 12);
                hideDecorativeBubble(this);
            }
            return result;
        };
        if (typeof frames === 'function')
            room.onFrames = function () {
                var result = frames.apply(this, arguments);
                //1983 is scheduled on rootNode and reopens the random NPC chatter. Its
                //controller is this scene; do not alter the shared Hot Spring bubble.
                hideDecorativeBubble(this.controller || this);
                return result;
            };
        room.__nhCaptureRulesLayout = true;
    }
    if (typeof HuoDongPaiHang === 'undefined' || !HuoDongPaiHang.prototype || HuoDongPaiHang.prototype.__nhCaptureRefresh)
        return;
    var proto = HuoDongPaiHang.prototype, receive = proto.onChangeRankInfoData, remove = proto.onRemoveMe, init = proto.initUI;
    if (typeof receive !== 'function' || typeof remove !== 'function' || typeof init !== 'function')
        return;
    proto.initUI = function () {
        this.__nhCaptureDisposed = false;
        return init.apply(this, arguments);
    };
    proto.onChangeRankInfoData = function () {
        if (this.__nhCaptureDisposed)
            return;
        var data = PaihangbangInfoData.getInstance();
        // All leaderboard types share this data object. Another panel's result
        // cannot repaint Capture with its old cached list or dismiss a popup.
        if (Number(data.type) !== 6)
            return;
        var result = receive.apply(this, arguments);
        //3166 removes this exact callback first. Rearm only if it did not close
        //the panel (null list) and the scene is still the visible owner.
        if (!this.__nhCaptureDisposed && ContentView.currentPage === this && data.zhuarenzheList != null) {
            //3166 writes the label only for a positive rank. A weekly reset or a
            //player falling out of the ranking must not retain the old position.
            if (!(Number(data.zhuarenzheMyRank) > 0) && this.RankingLabel)
                this.RankingLabel.setString('-');
            data.addEventListener(EventType.EVENT_CHANGE, this, 'onChangeRankInfoData');
        }
        return result;
    };
    proto.onRemoveMe = function () {
        this.__nhCaptureDisposed = true;
        return remove.apply(this, arguments);
    };
    proto.__nhCaptureRefresh = true;
}

"use strict";
function __NH_INSTALL_RECRUITMENT_NOTICES() {
    if (typeof GameConnection === 'undefined' || !GameConnection.onmessage || !GameConnection.handleGameCommand ||
        typeof ChatData === 'undefined' || typeof PromptBox === 'undefined' || !PromptBox.prototype ||
        typeof PromptBox.prototype.timeOut !== 'function' || GameConnection.__nhRecruitmentNotices)
        return;
    var seen = {}, order = [], initialized = false, popups = [], activeBox = null, activeText = null;
    var popupEnabled = true, settingsScene = null;
    //Preferensi popup disimpan lokal di perangkat (server tidak punya handler setRecruitmentPopup, jadi tidak lagi bergantung padanya).
    var localPopup = true;
    try { localPopup = sys.localStorage.getItem('nh_pull_popup_v1') !== '0'; } catch (e) { }
    GameConnection.__nhGetRecruitPopup = function () { return popupEnabled && localPopup; };
    GameConnection.__nhSetRecruitPopup = function (v) {
        localPopup = !!v;
        try { sys.localStorage.setItem('nh_pull_popup_v1', localPopup ? '1' : '0'); } catch (e) { }
        if (!localPopup)
            clearPopups();
    };
    function refreshSettings() { if (settingsScene && typeof settingsScene.__nhRefreshRecruitmentPopup === 'function')
        settingsScene.__nhRefreshRecruitmentPopup(); }
    var originalTimeout = PromptBox.prototype.timeOut;
    function popupAllowed() {
        var page = typeof MainView !== 'undefined' ? String(MainView.page || '') : '';
        return popupEnabled && localPopup && initialized && !!GameConnection.session && !GameConnection.networkInstableState && !!page &&
            page !== 'gameLoad' && !(/login|server/i).test(page);
    }
    function clearPopups() {
        popups = [];
        //Do not close a reward/error message which has since replaced our popup.
        if (activeBox && activeText && activeBox.txtTF && typeof activeBox.txtTF.getString === 'function' && activeBox.txtTF.getString() === activeText)
            originalTimeout.call(activeBox);
        activeBox = null;
        activeText = null;
    }
    function drainPopups() {
        if (!popups.length)
            return;
        if (!popupAllowed()) {
            clearPopups();
            return;
        }
        var box = PromptBox.getInstance();
        //An ordinary reward popup owns its existing timer. Wait for its actual hide
        //callback rather than replacing it or polling while it is visible.
        if (box.isVisible())
            return;
        var text = popups.shift();
        activeBox = box;
        activeText = text;
        box.updataTxt(text);
    }
    PromptBox.prototype.timeOut = function () {
        var result = originalTimeout.apply(this, arguments);
        if (this === activeBox) {
            activeBox = null;
            activeText = null;
        }
        //1344 reveals for1s, then1345 schedules this one-shot hide after3s. Reuse
        //that lifecycle for a bounded FIFO; no idle timer or extra polling exists.
        drainPopups();
        return result;
    };
    function plain(value, limit) {
        // ChatLabel463 uses LabelTTF.setString, never HTML, rich text, eval, or a
        // format template. Remove controls/bidi overrides and keep all names literal.
        return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, ' ').slice(0, limit) : '';
    }
    function render(notice) {
        if (!notice || typeof notice.id !== 'string' || !(/^[1-9][0-9]{0,18}$/).test(notice.id) ||
            typeof notice.realm !== 'number' || notice.realm < 0 || Math.floor(notice.realm) !== notice.realm ||
            Object.prototype.toString.call(notice.heroes) !== '[object Array]' || notice.heroes.length < 1 || notice.heroes.length > 10)
            return null;
        var name = plain(notice.playerName, 32), parts = [], popupTexts = [], ranks = { 5: 'S', 6: 'SS', 7: 'SSS', 8: 'UR' }, total = 0;
        if (!name)
            return null;
        //kind: 'recruit' (gacha ninja, default) | 'box' (Ninja Box) | 'skill' (gacha skill). Unknown values fall back to recruit.
        var kind = notice.kind === 'box' || notice.kind === 'skill' ? notice.kind : 'recruit', src = plain(notice.source, 32);
        var pf = GameConnection.__nhPullFilter;   //diisi panel profil: sembunyikan notifikasi tarikan pemain lain (UR/SSS/SS, gacha/box)
        if (pf && (kind === 'box' ? pf.box : pf.gacha))
            return null;
        var verb = kind === 'recruit' ? ' recruited ' : ' obtained ', label = kind === 'skill' ? 'skill ' : '';
        var from = kind !== 'recruit' && src ? ' from ' + src : '';
        for (var i = 0; i < notice.heroes.length; i++) {
            var hero = notice.heroes[i], quality = hero && Number(hero.quality), count = hero && Number(hero.count), roleName = hero && plain(hero.name, 64);
            if (!hero || !ranks[quality] || !roleName || !isFinite(count) || count < 1 || count > 10 || Math.floor(count) !== count)
                return null;
            total += count;
            if (pf && pf.ranks && pf.ranks[ranks[quality]])
                continue;
            parts.push(ranks[quality] + ' ' + label + roleName + (count > 1 ? ' x' + count : ''));
            popupTexts.push(name + verb + ranks[quality] + ' ' + label + roleName + (kind === 'recruit' || count > 1 ? ' x' + count : '') + from + '.');
        }
        if (total > 10 || !parts.length)
            return null;
        return { chat: { scope: 2, noticeId: 'recruitment:' + notice.id, text: name + verb + parts.join(', ') + from + '.' }, popups: popupTexts };
    }
    var receive = GameConnection.onmessage;
    GameConnection.onmessage = function (message) {
        //345 defers complete packets while its reconnect dialog is open. Reset only
        //on actual delivery, just before the main adapter clears its chat arrays.
        if (message && message.chatReset && !this.networkInstableState) {
            clearPopups();
            seen = {};
            order = [];
            initialized = false;
            popupEnabled = true;
            refreshSettings();
        }
        return receive.apply(this, arguments);
    };
    var reduce = GameConnection.handleGameCommand;
    GameConnection.handleGameCommand = function (key, value) {
        if (key === 'recruitmentNoticesReset')
            return;
        if (key === 'recruitmentPopupEnabled') {
            if (typeof value === 'boolean') {
                popupEnabled = value;
                if (!value)
                    clearPopups();
                refreshSettings();
            }
            return;
        }
        if (key !== 'recruitmentNotices')
            return reduce.apply(this, arguments);
        if (Object.prototype.toString.call(value) !== '[object Array]')
            return;
        //The ordered bootstrap always sends one history array, even when empty.
        //Only later unseen IDs are live; reconnect history must never replay popups.
        var live = initialized, chat = ChatData.getInstance(), changed = false;
        for (var i = 0; i < value.length && i < 50; i++) {
            var rendered = render(value[i]), entry = rendered && rendered.chat;
            if (!entry || seen[entry.noticeId])
                continue;
            //No id/messageId: player-chat ACL watermarks and clickable sender lookups
            //must not interpret a recruitment notice ID as another player's message.
            chat.setObj(entry);
            //ChatData stores SYSTEM-scope rows in BOTH worldTalks and sysTalks. Server notices belong to the
            //System Channel only, so drop the row (same object reference) from the World Channel list.
            if (chat.worldTalks && typeof chat.worldTalks.length === 'number')
                for (var w = chat.worldTalks.length - 1; w >= 0; w--)
                    if (chat.worldTalks[w] === entry)
                        chat.worldTalks.splice(w, 1);
            changed = true;
            seen[entry.noticeId] = true;
            order.push(entry.noticeId);
            if (order.length > 500)
                delete seen[order.shift()];
            if (live && popupEnabled && localPopup)
                for (var p = 0; p < rendered.popups.length; p++) {
                    if (popups.length >= 50)
                        popups.shift();
                    popups.push(rendered.popups[p]);
                }
        }
        initialized = true;
        //Reconnect may deliver50 rows together. Follow the existing chatRefresh
        //reducer's batch path so open chat panels repaint once, not50 times.
        if (changed) {
            if (typeof chat.onDataChange === 'function')
                chat.onDataChange();
            if (typeof chat.dispatchEvents === 'function')
                chat.dispatchEvents(EventType.EVENT_CHANGE);
        }
        drainPopups();
    };
    for (var lifecycle = 0, names = ['login', 'onclose', 'sessionClose']; lifecycle < names.length; lifecycle++)
        (function (name) {
            var previous = GameConnection[name];
            if (typeof previous !== 'function')
                return;
            GameConnection[name] = function () { clearPopups(); initialized = false; popupEnabled = true; refreshSettings(); return previous.apply(this, arguments); };
        })(names[lifecycle]);
    if (typeof SetUpScene !== 'undefined' && SetUpScene.prototype && typeof SetUpScene.prototype.initUI === 'function' &&
        typeof ynSHowButton !== 'undefined' && typeof cc !== 'undefined') {
        var cloneNoticeButton = function (source, offset) {
            if (!source || !source.getTexture || !source.getTextureRect || !source.getParent)
                return null;
            var node = cc.Sprite.createWithTexture(source.getTexture(), source.getTextureRect());
            node.setAnchorPoint(source.getAnchorPoint());
            node.setPosition(source.getPositionX(), source.getPositionY() - offset);
            node.setScaleX(source.getScaleX() * .55);
            node.setScaleY(source.getScaleY() * .55);
            source.getParent().addChild(node, source.getZOrder ? source.getZOrder() : 0);
            return node;
        };
        var originalSettingsInit = SetUpScene.prototype.initUI;
        SetUpScene.prototype.initUI = function () {
            var result = originalSettingsInit.apply(this, arguments);
            if (this.__nhRecruitmentPopupTouch)
                return result;
            var controls = this.scene && this.scene.controller;
            if (!controls || !controls.t0 || !controls.t1 || !controls.bg1_0 || !controls.bg1_1)
                return result;
            var stamina = controls.t1, rowGap = Math.abs(controls.t0.getPositionY() - stamina.getPositionY());
            if (rowGap < 20 || rowGap > 90)
                return result;
            // The existing beige panel has room for a compact third left-hand row.
            // Never resize CCB backgrounds: the right-hand Forge notice shares them.
            var offset = rowGap * .62;
            var onButton = cloneNoticeButton(controls.bg1_1, offset), offButton = cloneNoticeButton(controls.bg1_0, offset);
            if (!onButton || !offButton)
                return result;
            var label = cc.LabelTTF.create('Rare Ninja Popup', stamina.getFontName ? stamina.getFontName() : 'Helvetica', 12, cc.size(140, 32), cc.TEXT_ALIGNMENT_LEFT);
            label.setAnchorPoint(stamina.getAnchorPoint());
            label.setPosition(stamina.getPositionX(), stamina.getPositionY() - offset);
            if (stamina.getColor)
                label.setColor(stamina.getColor());
            stamina.getParent().addChild(label, stamina.getZOrder ? stamina.getZOrder() : 1);
            function toggleText(button, word, reference) {
                var size = button.getContentSize(), value = cc.LabelTTF.create(word, reference && reference.getFontName ? reference.getFontName() : 'Helvetica', 20);
                value.setPosition(size.width / 2, size.height / 2);
                if (reference && reference.getColor)
                    value.setColor(reference.getColor());
                button.addChild(value, 1);
                return value;
            }
            var onText = toggleText(onButton, 'On', controls.btnTF1_1), offText = toggleText(offButton, 'Off', controls.btnTF1_0);
            this.__nhRecruitmentPopupTouch = new ynSHowButton('popupNotifBtn', onButton, onText, offText, offButton);
            this.touchList.push(this.__nhRecruitmentPopupTouch);
            this.__nhRefreshRecruitmentPopup = function () { onButton.setVisible(popupEnabled); offButton.setVisible(!popupEnabled); };
            this.__nhRefreshRecruitmentPopup();
            settingsScene = this;
            return result;
        };
        var originalSettingsTouch = SetUpScene.prototype.onTouchesEnded;
        SetUpScene.prototype.onTouchesEnded = function () {
            var result = originalSettingsTouch.apply(this, arguments);
            if (this.touchTarget && this.touchTarget === this.__nhRecruitmentPopupTouch &&
                typeof GameConnection.send === 'function')
                GameConnection.send('setRecruitmentPopup', { enabled: !popupEnabled });
            return result;
        };
        var originalSettingsRemove = SetUpScene.prototype.onRemoveMe;
        if (typeof originalSettingsRemove === 'function')
            SetUpScene.prototype.onRemoveMe = function () {
                if (settingsScene === this)
                    settingsScene = null;
                return originalSettingsRemove.apply(this, arguments);
            };
    }
    GameConnection.__nhRecruitmentNotices = true;
}

"use strict";
function __NH_INSTALL_TRIAL_REWARD_DISPLAY() {
    if (typeof ExamBox === 'undefined' || !ExamBox.prototype || ExamBox.prototype.__nhTrialRewardDisplay)
        return;
    var proto = ExamBox.prototype, bonus = proto.bonusStr, update = proto.updata;
    if (typeof bonus !== 'function' || typeof update !== 'function')
        return;
    proto.bonusStr = function (silver, itemId, count) {
        //2882 accepts only silver/item, so its existing localized silver prefix and
        //catalog item name remain intact while the fourth record slot becomes visible.
        var text = bonus.call(this, this.__nhTrialZeroSilver === true ? 0 : silver, itemId);
        if (itemId) {
            var amount = Number(count);
            if (!isFinite(amount) || amount < 1 || Math.floor(amount) !== amount)
                amount = 1;
            text += ' x' + amount;
        }
        return text;
    };
    proto.updata = function (record, index) {
        //2881 branches on truthiness of silver, incorrectly showing a defeat when
        //a winning floor is configured for zero silver. Its only other use of this
        //slot is the bonusStr call above. Adapt that local display argument while
        //retaining zero in the label; never change the receipt, wallet or inventory.
        if (Object.prototype.toString.call(record) !== '[object Array]' || record.length < 2 || record[1] !== 0)
            return update.apply(this, arguments);
        var display = record.slice(0), previous = this.__nhTrialZeroSilver, args = [];
        for (var i = 0; i < arguments.length; i++)
            args.push(arguments[i]);
        display[1] = 1;
        args[0] = display;
        this.__nhTrialZeroSilver = true;
        try {
            return update.apply(this, args);
        }
        finally {
            this.__nhTrialZeroSilver = previous;
        }
    };
    proto.__nhTrialRewardDisplay = true;
}

"use strict";
function __NH_INSTALL_APP_LIFECYCLE() {
    if (typeof jsbTools === 'undefined' || !jsbTools ||
        typeof jsbTools.didEnterBackground !== 'function' ||
        typeof jsbTools.gameEixt !== 'function')
        return;
    // ── NH: SESI HILANG SAAT KELUAR GAME ─────────────────────────────────────
    // Game asli menutup dirinya sendiri (jsbTools.gameEixt) saat masuk background setelah login. Proses mati ->
    // socket putus -> server menjalankan endSession; buka lagi = loading dari awal (sama seperti server resmi).
    // Wrapper di bawah dulu MEMBLOKIR perilaku itu. Sekarang default-nya perilaku asli (tidak dipasang).
    // Kembalikan guard lama (game tetap hidup di background) dengan menambah  "exitOnBackground": false
    // di __NH_BACKEND_CONFIG (baris `var __NH_BACKEND_CONFIG=` di atas file ini).
    var __nhCfg = (typeof __NH_BACKEND_CONFIG !== 'undefined' && __NH_BACKEND_CONFIG) || {};
    if (__nhCfg.exitOnBackground !== false)
        return;
    var tools = jsbTools;
    var original = tools.didEnterBackground;
    if (original.__nhBackgroundNoExit)
        return;
    var background = function () {
        // gameEixt is normally inherited from the native JSBTools prototype. Keep
        // the exact own-property state as well as the function so no permanent
        // replacement leaks into explicit exit actions, even if the callback throws
        // or synchronously re-enters this wrapper.
        var ownExit = Object.getOwnPropertyDescriptor(tools, 'gameEixt');
        var ignoreBackgroundExit = function () { };
        try {
            tools.gameEixt = ignoreBackgroundExit;
            if (tools.gameEixt !== ignoreBackgroundExit)
                throw new Error('Unable to guard background game exit');
            return original.apply(this, arguments);
        }
        finally {
            if (ownExit)
                Object.defineProperty(tools, 'gameEixt', ownExit);
            else
                delete tools.gameEixt;
        }
    };
    background.__nhBackgroundNoExit = true;
    tools.didEnterBackground = background;
    // Callback3891 (willEnterForeground) only disables pending local notices.
    // Native foreground handling already restarts animation and audio; leave
    // both paths unchanged. The installer runs after the recovered main script.
}

"use strict";
/** Keep the two shared capture effects across the room → claw → room loop.
 * Recovered MainView.onDone480 purges armatures before installing the next
 * page;2330/2332 and3538/3540 then reload the same effects synchronously via
 *4000/4001. Protect only these already-loaded files during an internal capture
 * transition. All other assets and every exit retain the original cleanup.
 * No result, request, RNG, animation duration or loader callback is replaced. */
function __NH_INSTALL_RAFFLE_PERFORMANCE() {
    if (typeof MainView === 'undefined' || typeof MainView.setPageView !== 'function' ||
        typeof ArmatureLoad === 'undefined' || !ArmatureLoad.prototype ||
        typeof ArmatureLoad.prototype.removeAllCache !== 'function' ||
        typeof GameTools === 'undefined' || !GameTools.prototype ||
        typeof GameTools.prototype.removeCachePlist !== 'function' ||
        ArmatureLoad.__nhRafflePerformance)
        return;
    var internalTransition = false, navigating = false, mainCleanup = false;
    var rewardRemoval = false, rewardBackgroundHeld = false;
    var effectNames = ['hengxiangguangzhu', 'guanghuan'];
    var rewardBackground = 'image/ibg/huodebg';
    var removePlist = GameTools.prototype.removeCachePlist;
    var metrics = { effectEvictionsAvoided: 0, rewardBackgroundEvictionsDeferred: 0 };
    function capturePage(page) {
        page = String(page || 'home');
        return page === '1' || page === '17' || page === 'ninJaRoomSelect' || page === 'NinJaCraneSelect';
    }
    function flushRewardBackground() {
        if (!rewardBackgroundHeld)
            return;
        rewardBackgroundHeld = false;
        removePlist.call(GameTools.getInstance(), rewardBackground);
    }
    //476 assigns the incoming page before calling onDone on the outgoing scene.
    //Read both endpoints before delegating; page alone inside the purge has lost
    //the source. finally also restores nested/failed/blocked navigation.
    var setPage = MainView.setPageView;
    MainView.setPageView = function (page) {
        var previous = internalTransition, previousNavigation = navigating;
        navigating = true;
        internalTransition = capturePage(MainView.page) && capturePage(page);
        try {
            return setPage.apply(this, arguments);
        }
        finally {
            internalTransition = previous;
            navigating = previousNavigation;
            if (!capturePage(MainView.page))
                flushRewardBackground();
        }
    };
    var onDone = MainView.onDone;
    if (typeof onDone === 'function')
        MainView.onDone = function () {
            var previous = mainCleanup;
            mainCleanup = true;
            try {
                return onDone.apply(this, arguments);
            }
            finally {
                mainCleanup = previous;
                if (!internalTransition)
                    flushRewardBackground();
            }
        };
    var removeArmatures = ArmatureLoad.prototype.removeAllCache;
    ArmatureLoad.prototype.removeAllCache = function () {
        if (!internalTransition) {
            flushRewardBackground();
            return removeArmatures.apply(this, arguments);
        }
        var cache = this._armatureObject, saved = [];
        if (!cache)
            return removeArmatures.apply(this, arguments);
        //The recovered purge removes files by traversing this map. Keep records
        //and native data paired; never invent a cache hit or preload a new file.
        for (var i = 0; i < effectNames.length; i++) {
            var key = effectNames[i], entry = cache[key];
            if (entry && entry.url === key && Number(entry.ty) === 1) {
                saved.push({ key: key, entry: entry });
                delete cache[key];
            }
        }
        try {
            return removeArmatures.apply(this, arguments);
        }
        finally {
            for (var n = 0; n < saved.length; n++) {
                cache[saved[n].key] = saved[n].entry;
                metrics.effectEvictionsAvoided++;
            }
        }
    };
    GameTools.prototype.removeCachePlist = function (path) {
        //3474 evicts the reward heading texture after every ninja result. Reuse
        //only that 561×90 texture while the player remains in either Capture room.
        //The following real scene cleanup or exit releases it through1582.
        if (rewardRemoval && typeof path === 'string' && path.replace(/\.png$/, '') === rewardBackground) {
            rewardBackgroundHeld = true;
            metrics.rewardBackgroundEvictionsDeferred++;
            return;
        }
        return removePlist.apply(this, arguments);
    };
    if (typeof GainNinJaScene !== 'undefined' && GainNinJaScene.prototype &&
        typeof GainNinJaScene.prototype.onRemoveMe === 'function') {
        var removeReward = GainNinJaScene.prototype.onRemoveMe;
        GainNinJaScene.prototype.onRemoveMe = function () {
            var previous = rewardRemoval;
            //Do not retain a reward texture while an outgoing capture scene is being
            //removed for another destination (profile/map/login, for example).
            rewardRemoval = capturePage(MainView.page) && (internalTransition || !navigating && !mainCleanup);
            try {
                return removeReward.apply(this, arguments);
            }
            finally {
                rewardRemoval = previous;
            }
        };
    }
    //This is a bounded reuse policy, not a memory-warning bypass. Explicit full
    //loader teardown always retains its original purge semantics.
    var removeAllData = ArmatureLoad.prototype.removeAllDate;
    if (typeof removeAllData === 'function')
        ArmatureLoad.prototype.removeAllDate = function () {
            flushRewardBackground();
            return removeAllData.apply(this, arguments);
        };
    ArmatureLoad.__nhRafflePerformance = metrics;
}

"use strict";
(function installBackendAdapter() {
    var config = __NH_BACKEND_CONFIG;
    var altarPending = null, costumeRules = null, shopRules = null, laboratoryRules = null;
    var lessonPending = null, skillDecisionPending = false, ramenClaimPending = false;
    function restoreLesson() {
        if (!lessonPending)
            return;
        PromptView.setPageView(null);
        ContentView.setPageView('sKillReplace', { idList: [lessonPending.sid, lessonPending.currentSid] });
    }
    var chatSeen = {}, chatOrder = [], chatRefreshRevision = 0, chatRefreshThroughId = 0;
    var treasureRound = null, treasureReadyAt = 0, treasureClaimPending = false, treasureClaimSequence = 0;
    var treasureKnown = false, treasureStartScene = null, treasureReadScene = null, treasureClaimScene = null, treasureClaimId = null;
    var treasureReceiptRoundId = null;
    function syncTreasureRetry(scene) {
        if (!scene || scene.__nhTreasureDisposed)
            return;
        var collected = scene.__nhTreasureCollected;
        scene.__nhTreasureRetry = !!(treasureKnown && treasureRound && collected && collected.roundId === treasureRound.id && !treasureClaimPending);
        if (treasureKnown && collected && (!treasureRound || collected.roundId !== treasureRound.id))
            scene.__nhTreasureCollected = null;
    }
    function releaseTreasure(restore, invalidate) {
        var scene = treasureClaimScene || treasureStartScene || treasureReadScene;
        treasureStartScene = treasureReadScene = treasureClaimScene = treasureClaimId = null;
        treasureClaimPending = false;
        treasureClaimSequence++;
        if (invalidate) {
            treasureKnown = false;
            treasureRound = null;
            treasureReadyAt = 0;
        }
        syncTreasureRetry(scene);
        if (restore && scene && !scene.__nhTreasureDisposed && typeof MainView !== 'undefined' && MainView.currentPage === scene) {
            if (scene.setEnabledAll)
                scene.setEnabledAll(true);
            if (scene.showMenu)
                scene.showMenu(true);
            if (scene.cdChange)
                scene.cdChange();
            if (PromptView.page === 'loading')
                PromptView.setPageView(null);
        }
    }
    function readTreasure(scene) {
        treasureReadScene = scene;
        PromptView.setPageView('loading');
        return handoffTreasure(scene, 'openBuild', function () { return GameConnection.send('openBuild', { id: 4 }); });
    }
    function handoffTreasure(scene, command, sendAction) {
        var session = GameConnection.session, send = session && session.send, handedOff = false;
        var observe = function (event) {
            var result = send.apply(this, arguments);
            if (event && event.source && Object.prototype.hasOwnProperty.call(event.source, command))
                handedOff = true;
            return result;
        };
        if (typeof send === 'function')
            session.send = observe;
        try {
            return sendAction();
        }
        finally {
            if (session && session.send === observe)
                session.send = send;
            // Actual341 silently returns without a session or catches transport
            // exceptions. The outcome is uncertain: refresh before any new charge.
            if (!handedOff)
                releaseTreasure(true, true);
        }
    }
    var treasureSeen = {}, treasureOrder = [];
    var localTaskConfig = null, localTaskClaimPending = false;
    var localTaskSeen = {}, localTaskOrder = [];
    var homeCoinSeen = {}, homeCoinOrder = [];
    var coreOnboardingCompleted = false, pendingCoreLesson = null;
    function canResumeStarterScroll() {
        if (coreOnboardingCompleted || pendingCoreLesson !== 'rasengan' || typeof UserData === 'undefined' ||
            Number(UserData.getInstance().lv) !== 2 || typeof RoleData === 'undefined' || typeof InventoryData === 'undefined')
            return false;
        var roles = RoleData.getInstance(), starter = roles.heros && roles.heros[1];
        if (typeof roles.getCurrentKey !== 'function' || Number(roles.getCurrentKey()) !== 1 || !starter || !starter.skill)
            return false;
        var skills = starter.skill[0] || [], count = 0;
        for (var si = 0; si < skills.length; si++) {
            if (Number(skills[si]) === 1125)
                return false;
            if (skills[si])
                count++;
        }
        if (Number(skills[2]) !== 1152 || count !== 3)
            return false;
        var inventory = InventoryData.getInstance(), items = inventory.allList && inventory.allList[2] || [];
        for (var ii = 0; ii < items.length; ii++) {
            var item = items[ii];
            if (item && (Number(item.id) === 4125 && Number(item.s) >= 10 ||
                ii === 0 && Number(item.id) === 5000 && Number(item.s) >= 1))
                return true;
        }
        return false;
    }
    var beastConfig = null, beastResultsExpiresAt = 0;
    function beastAttacksOpen() {
        return typeof UserData !== 'undefined' && Number(UserData.getInstance().beastOpen) === 1;
    }
    function beastResultsAvailable() {
        if (beastResultsExpiresAt <= Date.now())
            beastResultsExpiresAt = 0;
        return beastResultsExpiresAt > Date.now();
    }
    function closedBeastAttack() {
        if (typeof PromptBox !== 'undefined')
            PromptBox.getInstance().updataTxt('This Tailed Beast session is closed.');
    }
    function syncBeastControls(view) {
        if (!view || !view.scene || !view.scene.controller)
            return;
        var controller = view.scene.controller, active = beastAttacksOpen();
        // Recovered3456 binds these nodes to the tiaozhan hit target. Hiding
        // only the CCB nodes would leave that target in onTouchesHit's list.
        if (controller.tiaozhanBtn)
            controller.tiaozhanBtn.setVisible(active);
        if (controller.tiaozhanTF)
            controller.tiaozhanTF.setVisible(active);
        if (!active && controller.cdContainer)
            controller.cdContainer.setVisible(false);
        if (!view.touchList)
            return;
        var attackIndex = -1;
        for (var bi = 0; bi < view.touchList.length; bi++)
            if (view.touchList[bi] && view.touchList[bi]._ty === 'tiaozhan') {
                attackIndex = bi;
                break;
            }
        if (!active && attackIndex >= 0) {
            view.__nhBeastAttackTarget = view.touchList[attackIndex];
            view.__nhBeastAttackIndex = attackIndex;
            view.touchList.splice(attackIndex, 1);
        }
        else if (active && attackIndex < 0 && view.__nhBeastAttackTarget) {
            view.touchList.splice(Math.min(view.__nhBeastAttackIndex, view.touchList.length), 0, view.__nhBeastAttackTarget);
        }
    }
    if (typeof LoginScene !== 'undefined' && LoginScene.prototype && !LoginScene.prototype.__nhCoreOnboarding) {
        var legacyLoginEnd = LoginScene.prototype.loginEnd;
        LoginScene.prototype.loginEnd = function () {
            if (canResumeStarterScroll() && typeof ContentView !== 'undefined' && typeof ContentView.setPageView === 'function') {
                // Keep4097's listener cleanup, analytics and home construction. Only
                // its next-battle dialogue is replaced during this one login callback;
                // Home1809 then follows the real Warehouse/School guide with no grant.
                var showLoginContent = ContentView.setPageView;
                ContentView.setPageView = function (page, data) {
                    if (page === 'dialogue' && data && Number(data.id) === 200007 && data.done === 'dialogueCompleteTiro12') {
                        var resumed = {};
                        for (var property in data)
                            if (Object.prototype.hasOwnProperty.call(data, property))
                                resumed[property] = data[property];
                        resumed.id = 200006;
                        resumed.done = 'dialogueCompleteTiro5';
                        return showLoginContent.call(this, page, resumed);
                    }
                    return showLoginContent.apply(this, arguments);
                };
                try {
                    return legacyLoginEnd.apply(this, arguments);
                }
                finally {
                    ContentView.setPageView = showLoginContent;
                }
            }
            if (!coreOnboardingCompleted || typeof UserData === 'undefined' || Number(UserData.getInstance().lv) !== 3 ||
                typeof PromptLayer === 'undefined' || typeof PromptLayer.setPageView !== 'function')
                return legacyLoginEnd.apply(this, arguments);
            // Recovered4097: level3 + fewer than3 owned heroes or an empty third
            // fighter restarts core guide17/21, even after legitimate later edits.
            // Scope the filter to this synchronous login callback; other guides and
            // every later scene keep their original routing and global isTiro value.
            var showLoginPrompt = PromptLayer.setPageView;
            PromptLayer.setPageView = function (page, data) {
                if (page === 'tiroScene' && (data === 17 || data === 21))
                    return;
                return showLoginPrompt.apply(this, arguments);
            };
            try {
                return legacyLoginEnd.apply(this, arguments);
            }
            finally {
                PromptLayer.setPageView = showLoginPrompt;
            }
        };
        LoginScene.prototype.__nhCoreOnboarding = true;
    }
    function disableLocalAds() {
        if (typeof BonusData !== 'undefined') {
            var bonus = BonusData.getInstance();
            bonus.pokktClickTime = 0;
            bonus.pokktRequested = false;
            bonus.pokktAdCached = false;
        }
        if (typeof MainView !== 'undefined' && MainView.currentPage && MainView.currentPage.userInfor && MainView.currentPage.userInfor.pokktbtn)
            MainView.currentPage.userInfor.pokktbtn.setVisible(false);
    }
    function offerLocalTask() {
        if (localTaskConfig && localTaskConfig.ready && !localTaskClaimPending && typeof MainView !== 'undefined' &&
            String(MainView.page) === '4' && MainView.currentPage && MainView.currentPage.showFacebookshare && !PromptView.page)
            MainView.currentPage.showFacebookshare();
    }
    if (!config || !/^https?:\/\//.test(config.http))
        throw new Error('Missing recovery backend configuration');
    // ── NH: ID perangkat + popup ban/maintenance ─────────────────────────────────────────────
    // Build Lyto tidak pernah mengirim deviceId (sendActivate hanya jalan untuk SDK Hede, dan
    // accountUtil.getDeviceId() mengembalikan string tetap "UNKNOWN_WIFI_1.0_UNKNOWN" untuk SEMUA
    // perangkat — tidak boleh dipakai untuk ban). Maka dibuat ID acak sendiri yang disimpan permanen
    // di localStorage dan ditempel ke request login/register/createRole sebagai ?deviceId=.
    var NH_DEVICE_KEY = 'nh_device_id_v1';
    function nhDeviceId() {
        try {
            var st = sys.localStorage, id = st && st.getItem(NH_DEVICE_KEY);
            if (id && /^[0-9a-f]{32}$/.test(String(id)))
                return String(id);
            id = '';
            for (var i = 0; i < 4; i++)
                id += ('00000000' + Math.floor(Math.random() * 4294967296).toString(16)).slice(-8);
            if (st)
                st.setItem(NH_DEVICE_KEY, id);
            return id;
        }
        catch (e) { return ''; }
    }
    var nhShownAt = 0, nhActiveAuth = null, nhHandledReq = null;
    function nhLog(m) { try { if (typeof log === 'function') log('NH_BAN ' + m); } catch (e) { } }
    // Popup bawaan game ('loginTip') dengan teks bebas. toLogin = kembali ke layar login.
    function nhShowNotice(text, toLogin) {
        text = String(text || '').trim();
        if (!text)
            return;
        nhShownAt = Date.now();
        try {
            if (toLogin) {
                try { GameConnection.sessionClose(); } catch (e) { }
                try { MainView.setPageView('login', { switchAccount: true }); } catch (e) { }
            }
            PromptView.setPageView(null);
            PromptView.setPageView('loginTip', { text: text });
        }
        catch (e) { try { PromptBox.getInstance().updataTxt(text); } catch (e2) { } }
    }
    var nhGuardCount = 0;
    function nhGuardHit(prop, rs, st) { if (++nhGuardCount <= 5) nhLog('XHR guard: ' + prop + ' diblok rs=' + rs + ' st=' + st); }
    var NativeXHR = XMLHttpRequest;
    XMLHttpRequest = function () {
        var request = new NativeXHR();
        var originalOpen = request.open;
        var originalSend = request.send;
        var ownBackend = false, authPath = false;
        request.open = function (method, url, async) {
            var match = String(url).match(/^https?:\/\/[^/]+(\/(?:game\/[^?#]+|notice)(?:\?[^#]*)?)$/);
            ownBackend = !!match;
            authPath = false;
            if (match) {
                url = config.http.replace(/\/$/, '') + match[1];
                // login / register / createRole: sertakan ID perangkat
                if (/^\/game\/(?:lyto\/)?(?:login|register)(?:\?|$)|^\/game\/createRole(?:\?|$)/.test(match[1])) {
                    authPath = true;
                    var did = nhDeviceId();
                    if (did && url.indexOf('deviceId=') < 0)
                        url += (url.indexOf('?') < 0 ? '?' : '&') + 'deviceId=' + did;
                }
            }
            return originalOpen.call(request, method, url, async === undefined ? true : async);
        };
        request.send = function (body) {
            if (ownBackend && typeof accountUtil !== 'undefined') {
                var token = accountUtil.getLoginSign();
                if (token)
                    request.setRequestHeader('Authorization', 'Bearer ' + token);
            }
            if (authPath)
                nhActiveAuth = request;
            var sent = originalSend.call(request, body === undefined ? null : body);
            if (authPath && typeof setTimeout === 'function') {
                var polls = 0;
                (function poll() {
                    if (replyDone || ++polls > 400)
                        return;
                    if (request.readyState === 4)
                        inspectReply(150);   // tunggu callback bawaan selesai dulu, lalu timpa popup "Unknown error"
                    else
                        setTimeout(poll, 60);
                }());
            }
            return sent;
        };
        var replyDone = false;
        function inspectReply(delay) {
            if (replyDone || !authPath || request.readyState !== 4)
                return;
            replyDone = true;
            if (nhHandledReq === request)
                return;   // teks popup sudah diganti saat popup dibuat
            try {
                if (request.status !== 200) { nhLog('http status ' + request.status); return; }
                var reply = JSON.parse(request.responseText);
                nhLog('reply code=' + reply.code + ' msg=' + reply.msg);
                if (reply && Number(reply.code) === -2 && reply.msg) {
                    if (delay && typeof setTimeout === 'function')
                        setTimeout(function () { nhShowNotice(reply.msg, false); }, delay);
                    else
                        nhShowNotice(reply.msg, false);
                }
            }
            catch (e) { nhLog('inspect error ' + e); }
        }
        // Balasan login/register dengan code -2 membawa pesan server (banned / device banned / maintenance),
        // tetapi callback bawaan klien hanya mengenal -1 dan selainnya menampilkan "Unknown error".
        // Setelah callback bawaan selesai, popup-nya diganti dengan pesan server.
        try {
            var userHandler = null, wrapped = null;
            var protoDesc = Object.getOwnPropertyDescriptor(NativeXHR.prototype, 'onreadystatechange');
            Object.defineProperty(request, 'onreadystatechange', {
                configurable: true, enumerable: true,
                get: function () { return wrapped; },
                set: function (fn) {
                    userHandler = fn;
                    wrapped = typeof fn !== 'function' ? fn : function () {
                        var result = fn.apply(this, arguments);
                        try { inspectReply(0); } catch (e) { }
                        return result;
                    };
                    if (protoDesc && typeof protoDesc.set === 'function')
                        protoDesc.set.call(request, wrapped);
                }
            });
        }
        catch (e) { }
        // [FIX crash] Engine native (MinXmlHttpRequest::_js_get_responseText) melempar std::logic_error -> abort()
        // bila responseText dibaca saat request belum selesai / gagal (status 0). Itu penyebab force close
        // saat boot/login (bugreport: 28 dari 32 crash). Jangan panggil getter native pada kondisi itu.
        try {
            ['responseText', 'response'].forEach(function (prop) {
                var d = Object.getOwnPropertyDescriptor(NativeXHR.prototype, prop);
                if (!d || typeof d.get !== 'function') return;
                Object.defineProperty(request, prop, {
                    configurable: true, enumerable: true,
                    get: function () {
                        var rs = 0, st = 0;
                        try { rs = request.readyState; st = request.status; } catch (e) { }
                        if (rs !== 4 || !st) { nhGuardHit(prop, rs, st); return prop === 'response' ? null : ''; }
                        try { return d.get.call(request); } catch (e) { return prop === 'response' ? null : ''; }
                    },
                    set: function (v) { if (typeof d.set === 'function') { try { d.set.call(request, v); } catch (e) { } } }
                });
            });
        }
        catch (e) { }
        return request;
    };
    // Callback login/register bawaan menampilkan popup 'loginTip' dengan teks "Unknown error" untuk code -2.
    // Saat popup itu dibuat (kita masih di dalam callback, readyState sudah 4), teksnya diganti dengan pesan server.
    (function installNoticeText() {
        var tries = 0;
        function hook() {
            if (typeof PromptView === 'undefined' || !PromptView || typeof PromptView.setPageView !== 'function') {
                if (++tries < 30 && typeof setTimeout === 'function')
                    setTimeout(hook, 1000);
                return;
            }
            if (PromptView.__nhNoticeText)
                return;
            var original = PromptView.setPageView;
            PromptView.setPageView = function (page, data) {
                try {
                    if (page === 'loginTip' && data && nhActiveAuth && nhActiveAuth.readyState === 4 && String(data.text) === 'Unknown error') {
                        var reply = JSON.parse(nhActiveAuth.responseText);
                        if (reply && Number(reply.code) === -2 && reply.msg) {
                            nhLog('loginTip diganti: ' + reply.msg);
                            data.text = String(reply.msg);
                            nhShownAt = Date.now();
                            nhHandledReq = nhActiveAuth;
                            nhActiveAuth = null;
                        }
                    }
                }
                catch (e) { nhLog('replace error ' + e); }
                return original.apply(this, arguments);
            };
            PromptView.__nhNoticeText = true;
        }
        hook();
    }());
    // Koneksi game ditutup server (ban akun / ban device / kick / maintenance): tanya server alasannya
    // lewat /game/banStatus (token sesi) dan tampilkan popup, lalu kembali ke layar login.
    (function installBanNotice() {
        var checking = false, tries = 0;
        function check() {
            if (checking || Date.now() - nhShownAt < 5000)
                return;
            checking = true;
            var done = function () { checking = false; };
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', config.http.replace(/\/$/, '') + '/game/banStatus?t=' + Date.now(), true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState !== 4)
                        return;
                    try {
                        var r = xhr.status === 200 ? JSON.parse(xhr.responseText) : null;
                        nhLog('banStatus ' + (r && r.state));
                        if (r && r.state && r.state !== 'ok' && r.msg)
                            nhShowNotice(r.msg, true);
                    }
                    catch (e) { }
                    done();
                };
                xhr.send(null);
            }
            catch (e) { done(); }
        }
        function hook() {
            if (typeof GameConnection === 'undefined' || typeof GameConnection.onclose !== 'function') {
                if (++tries < 30 && typeof setTimeout === 'function')
                    setTimeout(hook, 1000);
                return;
            }
            if (GameConnection.__nhBanNotice)
                return;
            var original = GameConnection.onclose;
            GameConnection.onclose = function () {
                var result = original.apply(this, arguments);
                try { check(); } catch (e) { }
                return result;
            };
            GameConnection.__nhBanNotice = true;
        }
        hook();
    }());
    function gameSocketUrl(url) {
        if (/\/nadsocket(?:\?|$)/.test(url)) {
            var scheme = 'ws:'; // libwebsockets in this engine build has no SSL, so wss:// cannot work
            url = scheme + '//' + config.gameHost + ':' + config.wsPort + '/nadsocket';
        }
        return url;
    }
    // The retained Android engine can expose WebSocket as a read-only global.
    // Rewrite the session's URL before it reaches that native constructor.
    if (typeof nad !== 'undefined' && typeof nad.sessionFactory === 'function') {
        var createGameSession = nad.sessionFactory;
        nad.sessionFactory = function (url, options, callback) {
            var target = gameSocketUrl(url);
            if (typeof log === 'function')
                log('NH_CONNECT session_target ' + target);
            return createGameSession.call(this, target, options, callback);
        };
    }
    if (typeof accountUtil !== 'undefined') {
        accountUtil.getRealSid = function () { return 0; };
        accountUtil.getRealServerIp = function () { return config.gameHost; };
        accountUtil.getLastServerIp = function () { return config.gameHost; };
    }
    if (typeof httpUtil !== 'undefined') {
        httpUtil.checkClientVersion = function () {
            if (typeof log === 'function') log('NH_CONN Bypassing checkClientVersion -> direct startInitUI');
            try {
                var ls = httpUtil.getLoginScene ? httpUtil.getLoginScene() : null;
                if (ls && typeof ls.startInitUI === 'function') {
                    ls.startInitUI(typeof _startInitUI !== 'undefined' ? _startInitUI : null);
                }
            } catch (eBypass) {
                if (typeof log === 'function') log('NH_CONN checkClientVersion bypass error: ' + eBypass);
            }
        };
    }
    if (typeof LoginScene !== 'undefined' && LoginScene.prototype) {
        LoginScene.prototype.toUpdateClient = function () {
            if (typeof log === 'function') log('NH_CONN toUpdateClient suppressed');
        };
    }
    if (typeof serverUtil !== 'undefined') {
        serverUtil.getVersion = function () { return config.version; };
        // ServerUtil loads its own persisted list before the HTTP response arrives.
        // Old installs retain "Local 1" and its append-only save can duplicate id 1.
        var originalServerList = serverUtil.getServerList;
        var currentServerList = function () {
            var list = originalServerList.apply(serverUtil, arguments), changed = false, beta = null;
            if (!Array.isArray(list))
                return list;
            for (var i = list.length - 1; i >= 0; i--) {
                var row = list[i];
                if (!Array.isArray(row) || Number(row[0]) !== 1)
                    continue;
                if (beta) {
                    list.splice(i, 1);
                    changed = true;
                    continue;
                }
                beta = row;
                if (row[1] !== 'Server 1') {
                    row[1] = 'Server 1';
                    changed = true;
                }
            }
            if (changed && typeof StoreData !== 'undefined' && typeof StoreConst !== 'undefined' && typeof _base64 !== 'undefined')
                StoreData.getInstance().storage.setItem(StoreConst.servers, _base64.encode(JSON.stringify(list)));
            return list;
        };
        serverUtil.getServerList = currentServerList;
        if (typeof serverUtil.getServerById === 'function') {
            var originalServerById = serverUtil.getServerById;
            serverUtil.getServerById = function () {
                // The entrance's selected-server text uses this direct lookup before
                // the network list arrives; the recovered lookup bypasses getServerList.
                currentServerList();
                return originalServerById.apply(this, arguments);
            };
        }
        if (typeof serverUtil.saveServerList === 'function') {
            var originalSaveServerList = serverUtil.saveServerList;
            serverUtil.saveServerList = function () {
                var result = originalSaveServerList.apply(this, arguments);
                currentServerList();
                return result;
            };
        }
    }
    if (typeof commonJsb !== 'undefined')
        commonJsb.getTestVersion = function () { return false; };
    // The local reward is earned by a settled game round. SDK strings are never receipts.
    if (typeof commonJsb !== 'undefined') {
        commonJsb.onShareSucc = function () { };
        commonJsb.onPlayPokktAd = function () { disableLocalAds(); };
    }
    if (typeof UserInfor !== 'undefined' && UserInfor.prototype)
        UserInfor.prototype.requestPokktAd = function () { disableLocalAds(); if (this.pokktbtn)
            this.pokktbtn.setVisible(false); };
    if (typeof WaBaoScene !== 'undefined' && WaBaoScene.prototype && !WaBaoScene.prototype.__nhLocalTask) {
        WaBaoScene.prototype.showFacebookshare = function () {
            if (localTaskConfig && localTaskConfig.ready && !localTaskClaimPending)
                PromptView.setPageView('tip', { tid: 7110, target: this, fun: 'openFacebookshare', cancelBoon: true });
        };
        WaBaoScene.prototype.openFacebookshare = function () {
            if (localTaskConfig && localTaskConfig.ready && !localTaskClaimPending) {
                localTaskClaimPending = true;
                GameConnection.send('getShareTaskAward', []);
            }
        };
        WaBaoScene.prototype.__nhLocalTask = true;
    }
    if (typeof GainItemScene !== 'undefined' && GainItemScene.prototype && !GainItemScene.prototype.__nhLocalTask) {
        var closeGainItem = GainItemScene.prototype.onTouchesEnded;
        GainItemScene.prototype.onTouchesEnded = function () {
            var wasReward = PromptView.page === 'gainItem';
            var result = closeGainItem.apply(this, arguments);
            if (wasReward)
                offerLocalTask();
            return result;
        };
        GainItemScene.prototype.__nhLocalTask = true;
    }
    if (typeof TeamData !== 'undefined' && TeamData.prototype && !TeamData.prototype.__nhFullClan) {
        var setTeam = TeamData.prototype.setObj;
        TeamData.prototype.setObj = function (data) {
            if (data && data.maxTeams !== undefined)
                this.maxTeams = data.maxTeams;
            if (data && data.name === '') {
                this.myTeamName = '';
                this.myTeamTitle = 6;
                this.currentMembersList = [];
                this.currentReqList = [];
                this.myArmyHeros = [];
                this.totalHerosNums = 0;
                this.playerSendHeroNums = 0;
            }
            return setTeam.apply(this, arguments);
        };
        TeamData.prototype.__nhFullClan = true;
    }
    if (typeof RankRecordInfoData !== 'undefined' && RankRecordInfoData.prototype && !RankRecordInfoData.prototype.__nhFullHistory) {
        var setRankHistory = RankRecordInfoData.prototype.setObj;
        RankRecordInfoData.prototype.setObj = function (data) { this.list = []; return setRankHistory.apply(this, arguments); };
        RankRecordInfoData.prototype.__nhFullHistory = true;
    }
    if (typeof TeamWarData !== 'undefined' && TeamWarData.prototype && !TeamWarData.prototype.__nhClosedWar) {
        var setWar = TeamWarData.prototype.setObj;
        TeamWarData.prototype.setObj = function (data) {
            if (data && typeof data.isWarOpened === 'boolean')
                this.isWarOpened = data.isWarOpened;
            return setWar.apply(this, arguments);
        };
        TeamWarData.prototype.__nhClosedWar = true;
    }
    if (typeof FriendData !== 'undefined' && FriendData.prototype && !FriendData.prototype.__nhFullFriends) {
        var setFriends = FriendData.prototype.setObj;
        FriendData.prototype.setObj = function (data) {
            if (data && data.ALL === 1) {
                this.friends = [];
                this.blacks = [];
            }
            if (data && Object.prototype.hasOwnProperty.call(data, 'friendInfo'))
                this.friendInfo = data.friendInfo;
            return setFriends.apply(this, arguments);
        };
        FriendData.prototype.__nhFullFriends = true;
    }
    if (typeof WeiShouJiTanScene !== 'undefined' && WeiShouJiTanScene.prototype && !WeiShouJiTanScene.prototype.__nhPendingAltar) {
        var injectAltar = WeiShouJiTanScene.prototype.send;
        WeiShouJiTanScene.prototype.send = function () {
            if (lessonPending) {
                restoreLesson();
                return;
            }
            return injectAltar.apply(this, arguments);
        };
        var openAltar = WeiShouJiTanScene.prototype.onChangeBuildData;
        WeiShouJiTanScene.prototype.onChangeBuildData = function () {
            var result = openAltar.apply(this, arguments);
            if (altarPending) {
                this.tableCellTouched(altarPending.hid);
                this.lastSid = altarPending.currentSid;
                ContentView.setPageView('sKillReplace', { idList: [altarPending.sid, altarPending.currentSid] });
            }
            return result;
        };
        WeiShouJiTanScene.prototype.__nhPendingAltar = true;
    }
    if (typeof SKillReplace !== 'undefined' && SKillReplace.prototype && !SKillReplace.prototype.__nhDiscardAltar) {
        var chooseSkill = SKillReplace.prototype.onTouchesEnded;
        SKillReplace.prototype.onTouchesEnded = function (touches) {
            var hit = GameTools.getInstance().onTouchesHit(touches[0], this.toucheList);
            if ((altarPending || lessonPending) && hit && hit === this.touchTarget && hit._ty === 'closeBtn')
                GameConnection.send('giveupSkill', {});
            return chooseSkill.apply(this, arguments);
        };
        SKillReplace.prototype.__nhDiscardAltar = true;
    }
    if (typeof JingJiShop !== 'undefined' && JingJiShop.prototype && !JingJiShop.prototype.__nhResultGuard) {
        var arenaShopResult = JingJiShop.prototype.OperResultDataChange;
        JingJiShop.prototype.OperResultDataChange = function () {
            if (Number(OperResultData.getInstance().type) !== 28)
                return;
            var selected = this.itemGroupObject && this.itemGroupObject[ShopNewData.getInstance().currentbuy_index];
            if (!selected)
                return;
            if (selected.count !== undefined)
                selected.num = selected.count;
            return arenaShopResult.apply(this, arguments);
        };
        JingJiShop.prototype.__nhResultGuard = true;
    }
    if (typeof CostumeData !== 'undefined' && CostumeData.prototype && !CostumeData.prototype.__nhFragments) {
        // Server menyimpan costume sebagai { [id]: level } (angka), sedangkan getLevel asli membaca this[id].lv
        // -> undefined -> Math.max(1, undefined) = NaN ("+NaN%"). Terima angka maupun { lv }.
        CostumeData.prototype.getLevel = function (id) {
            var v = this[id];
            if (!v)
                return 1;
            var lv = Number(typeof v === 'object' ? v.lv : v);
            return lv >= 1 ? lv : 1;
        };
        // Bonus % costume untuk semua ninja = jumlah semua costume yang dimiliki, tiap costume
        // nilai dasar + (level-1) x "up" (sama dengan angka di layar Costume & rumus power.js server).
        // Pemanggil memakai: stat x (1 + attr/100).
        CostumeData.prototype.getAttr = function (base) {
            var keys = ['att', 'def', 'hp', 'agi'];
            // base dari RoleData.checkSets = angka persen bonus set equipment (9/12/15) -> berlaku untuk keempat stat
            var sb = typeof base === 'number' && isFinite(base) ? base : 0;
            var result = base && typeof base === 'object' ? base : { att: sb, def: sb, hp: sb, agi: sb };
            var defs = Config.getInstance().costmueObject || {};
            for (var id in this) {
                if (!Object.prototype.hasOwnProperty.call(this, id) || !/^\d+$/.test(id) || !this[id] || !defs[id])
                    continue;
                var lv = this.getLevel(id);
                for (var ci = 0; ci < keys.length; ci++)
                    result[keys[ci]] = (Number(result[keys[ci]]) || 0) + Number(defs[id][keys[ci]] || 0) +
                        (lv - 1) * Number(defs[id][keys[ci] + 'up'] || 0);
            }
            return result;
        };
        CostumeData.prototype.buy = function (id) {
            var definition = Config.getInstance().costmueObject[id];
            if (!definition || !costumeRules)
                return;
            this.__nhUnlockId = Number(id);
            PromptView.setPageView('tip', { txt: 'Unlock with ' + (costumeRules.unlockGoldCost || 1500) + ' gold?', target: this, fun: '__nhConfirmUnlock' });
        };
        CostumeData.prototype.__nhConfirmUnlock = function () { GameConnection.send('costumeUnlock', { id: this.__nhUnlockId }); };
        CostumeData.prototype.__nhFragments = true;
    }
    if (typeof CostumeScene !== 'undefined' && CostumeScene.prototype && !CostumeScene.prototype.__nhLevelStats) {
        var costumePreview = CostumeScene.prototype.updateCostmueArrt;
        CostumeScene.prototype.updateCostmueArrt = function () {
            var result = costumePreview.apply(this, arguments), definition = Config.getInstance().costmueObject[this.currentKey];
            if (definition && this.costmueProps && this.costmueProps.controller) {
                var level = Math.max(1, Number(CostumeData.getInstance().getLevel(this.currentKey)) || 0), keys = ['att', 'def', 'hp', 'agi'], labels = ['atkp', 'defp', 'hpp', 'agip'];
                for (var cp = 0; cp < keys.length; cp++)
                    this.costmueProps.controller[labels[cp]].setString('+' + (Number(definition[keys[cp]] || 0) + (level - 1) * Number(definition[keys[cp] + 'up'] || 0)) + '%');
            }
            return result;
        };
        var upgradeCostume = CostumeScene.prototype.upgradeClicked;
        CostumeScene.prototype.upgradeClicked = function () {
            if (costumeRules && CostumeData.getInstance().getLevel(this.currentKey) >= costumeRules.maximumLevel) {
                PromptBox.getInstance().updataTxt('Costume is at maximum level.');
                return;
            }
            return upgradeCostume.apply(this, arguments);
        };
        CostumeScene.prototype.__nhLevelStats = true;
    }
    if (typeof ZhuangBeiScene !== 'undefined' && ZhuangBeiScene.prototype && !ZhuangBeiScene.prototype.__nhMergeCost) {
        ZhuangBeiScene.prototype.mergeHero = function () {
            var ids = this.mergeSelect;
            if (!ids || ids.length !== 3 || !ids[0] || !ids[1] || !ids[2]) {
                PromptBox.getInstance().updataTxt('Select three ninjas.');
                return;
            }
            var roles = RoleData.getInstance(), definition = Config.getInstance().roleObject[roles.getRoleID(ids[0])];
            if (!definition)
                return;
            var quality = roles.getQuality(definition.quality, ids[0]), cost = Config.getInstance().qualityRefObject[quality], user = UserData.getInstance();
            if (!cost || quality >= 8) {
                PromptBox.getInstance().updataTxt('UR ninjas cannot be merged.');
                return;
            }
            if (user.silver < Number(cost.mergeSilver || 0)) {
                PromptBox.getInstance().updataTxt('Not enough silver.');
                return;
            }
            if (user.gold < Number(cost.mergeGold || 0)) {
                PromptBox.getInstance().updataTxt('Not enough gold.');
                return;
            }
            GameConnection.send('mergeHero', { hids: ids.slice(0) });
        };
        ZhuangBeiScene.prototype.__nhMergeCost = true;
    }
    // Renaming is available on the modern realm without a legacy server-merge flag.
    if (typeof InputRenameLayer !== 'undefined' && InputRenameLayer.prototype && !InputRenameLayer.prototype.__nhRename) {
        InputRenameLayer.prototype.send = function () {
            if (!this.canChangeName()) {
                PromptBox.getInstance().updataTid(7129);
                return;
            }
            if (Number(this.data.type) === 1)
                this.changeNickName();
            else
                this.changeClanName();
        };
        InputRenameLayer.prototype.__nhRename = true;
    }
    if (typeof PaihangbangInfoData !== 'undefined' && PaihangbangInfoData.prototype && !PaihangbangInfoData.prototype.__nhClosedRank) {
        var setTopList = PaihangbangInfoData.prototype.setObj;
        PaihangbangInfoData.prototype.setObj = function (data) {
            var result = setTopList.apply(this, arguments);
            if (data && data.open !== undefined)
                this.activeStaus = data.open;
            if (data && data.start !== undefined) {
                this.start = data.start;
                this.end = data.end;
            }
            return result;
        };
        PaihangbangInfoData.prototype.__nhClosedRank = true;
    }
    // The old War shop randomizes locally on a device-time refresh. Once the
    // server supplies its stock, preserve that stock until the next snapshot.
    if (typeof WarInfoData !== 'undefined' && WarInfoData.prototype && !WarInfoData.prototype.__nhServerShop) {
        var setWarInfo = WarInfoData.prototype.setObj, getWarGroup = WarInfoData.prototype.getItemGoupId, refreshWarGroup = WarInfoData.prototype.getRefresh;
        WarInfoData.prototype.setObj = function (data) {
            //650 inherits generic setData326; it has no native setObj hook. Calling
            //an absent hook aborts326 before EVENT_CHANGE, leaving the scene empty.
            var result = typeof setWarInfo === 'function' ? setWarInfo.apply(this, arguments) : undefined;
            if (data && data.itemGoupId !== undefined && data.indexList) {
                this.itemGoupId = data.itemGoupId;
                this.indexList = data.indexList.slice(0);
                this.__nhAuthoritativeShop = true;
            }
            return result;
        };
        WarInfoData.prototype.getItemGoupId = function () { return this.__nhAuthoritativeShop ? this.itemGoupId : getWarGroup.apply(this, arguments); };
        WarInfoData.prototype.getRefresh = function () { return this.__nhAuthoritativeShop ? this.itemGoupId : refreshWarGroup.apply(this, arguments); };
        WarInfoData.prototype.__nhServerShop = true;
    }
    // Old Hall's callback reads the new Hall index once. Scope that getter to the
    // correct data during the synchronous callback, then restore the other mode.
    if (typeof RenYingTangScene !== 'undefined' && !RenYingTangScene.prototype.__nhHallIndex) {
        var oldHallChanged = RenYingTangScene.prototype.onChangeRecInfoData;
        RenYingTangScene.prototype.onChangeRecInfoData = function () {
            var getNewHall = NewRecInfoData.getInstance;
            NewRecInfoData.getInstance = function () { return RecInfoData.getInstance(); };
            try {
                return oldHallChanged.apply(this, arguments);
            }
            finally {
                NewRecInfoData.getInstance = getNewHall;
            }
        };
        RenYingTangScene.prototype.__nhHallIndex = true;
    }
    if (typeof NewSuiJiZuDui !== 'undefined' && !NewSuiJiZuDui.prototype.__nhHallBuilding) {
        NewSuiJiZuDui.prototype.check = function () {
            var buildings = BuildData.getInstance();
            if (buildings.getNum(15) > 0)
                return true;
            var cost = buildings.getFuncCost(15, 0);
            return UserData.getInstance().moneyEnough(cost.count, cost.id);
        };
        NewSuiJiZuDui.prototype.__nhHallBuilding = true;
    }
    if (typeof RenYingTangNewRoleBox !== 'undefined' && !RenYingTangNewRoleBox.prototype.__nhHallFragments) {
        var newHallTouch = RenYingTangNewRoleBox.prototype.onTouchesEnded;
        RenYingTangNewRoleBox.prototype.onTouchesEnded = function () {
            var data = NewRecInfoData.getInstance(), roles = RoleData.getInstance(), capacity = roles.getMaxLimit;
            if (data.completed)
                return;
            // Fragment rewards occupy the material bag, not a ninja slot.
            if (data.progress >= 100 && data.rewardHero === false)
                roles.getMaxLimit = function () { return true; };
            try {
                return newHallTouch.apply(this, arguments);
            }
            finally {
                roles.getMaxLimit = capacity;
            }
        };
        RenYingTangNewRoleBox.prototype.__nhHallFragments = true;
    }
    // Completed mode retains idx=list.length so original role boxes show every
    // reward as obtained; scenes already clamp their scroll target to the last row.
    function guardCompletedHall(ctor, dataClass) {
        if (!ctor || ctor.prototype.__nhHallComplete)
            return;
        var touch = ctor.prototype.onTouchesEnded;
        ctor.prototype.onTouchesEnded = function () { if (dataClass.getInstance().completed)
            return; return touch.apply(this, arguments); };
        ctor.prototype.__nhHallComplete = true;
    }
    if (typeof RenYingTangRoleBox !== 'undefined')
        guardCompletedHall(RenYingTangRoleBox, RecInfoData);
    if (typeof SuiJiZuDui !== 'undefined')
        guardCompletedHall(SuiJiZuDui, RecInfoData);
    if (typeof NewSuiJiZuDui !== 'undefined')
        guardCompletedHall(NewSuiJiZuDui, NewRecInfoData);
    function gradeLimitReached(roles, hid) {
        if (!laboratoryRules)
            return false;
        var definition = Config.getInstance().roleObject[roles.getRoleID(hid)];
        return definition && Number(roles.getSlv(hid) || 0) >= laboratoryRules.gradeCaps[Number(definition.quality) - 1];
    }
    // Training: hasil latihan (hero.props = [att,def,hp,agi]) ditambahkan ke atribut hero
    if (typeof RoleData !== 'undefined' && RoleData.prototype && !RoleData.prototype.__nhTrainProps) {
        var baseProperTypeNum = RoleData.prototype.getProperTypeNum;
        RoleData.prototype.getProperTypeNum = function (hid, type) {
            var total = baseProperTypeNum.apply(this, arguments);
            var hero = this.heros && this.heros[hid];
            var bonus = hero && Array.isArray(hero.props) ? Number(hero.props[Number(type)]) || 0 : 0;
            return total + bonus;
        };
        RoleData.prototype.__nhTrainProps = true;
    }
    if (typeof RoleData !== 'undefined' && RoleData.prototype && !RoleData.prototype.__nhPublicProfile) {
        var setPublicRoleData = RoleData.prototype.setData;
        RoleData.prototype.setData = function (data) {
            // InforUserScene2865 creates a separate RoleData. The singleton belongs to
            // the current player and must retain its original stat calculations.
            if (data && data.hes && Object.prototype.toString.call(data.mars) === '[object Array]' && this !== RoleData.getInstance()) {
                this.__nhRemoteProfileStats = null;
                var source = data.publicStats, publicHeroes = {}, valid = source && source.version === 1 && source.heroes &&
                    typeof source.teamPower === 'number' && isFinite(source.teamPower) && source.teamPower >= 0;
                if (valid)
                    for (var hid in data.hes)
                        if (Object.prototype.hasOwnProperty.call(data.hes, hid)) {
                            var stats = source.heroes[hid], copied = {}, statKeys = ['att', 'def', 'hp', 'agi', 'power'];
                            for (var si = 0; si < statKeys.length; si++) {
                                var stat = statKeys[si], value = stats && stats[stat];
                                if (typeof value !== 'number' || !isFinite(value) || value < 0 || Math.floor(value) !== value)
                                    valid = false;
                                copied[stat] = value;
                            }
                            publicHeroes[hid] = copied;
                        }
                if (valid)
                    this.__nhRemoteProfileStats = { heroes: publicHeroes, teamPower: source.teamPower };
                if (!this.__nhRemoteProfileBinding) {
                    var originalProfileStat = this.getProperTypeNum, originalProfilePower = this.getPower, originalProfileTotal = this.getAllPower;
                    this.getProperTypeNum = function (heroId, key) {
                        var profile = this.__nhRemoteProfileStats, hero = profile && profile.heroes[String(heroId)];
                        if (profile)
                            return hero && Object.prototype.hasOwnProperty.call(hero, key) && key !== 'power' ? hero[key] : 0;
                        return originalProfileStat.apply(this, arguments);
                    };
                    this.getPower = function (heroId) {
                        var profile = this.__nhRemoteProfileStats, hero = profile && profile.heroes[String(heroId)];
                        if (profile)
                            return hero ? hero.power : 0;
                        return originalProfilePower.apply(this, arguments);
                    };
                    this.getAllPower = function () {
                        if (this.__nhRemoteProfileStats)
                            return this.__nhRemoteProfileStats.teamPower;
                        return originalProfileTotal.apply(this, arguments);
                    };
                    this.__nhRemoteProfileBinding = true;
                }
            }
            if (data && Object.prototype.hasOwnProperty.call(data, 'publicStats')) {
                var originalData = data;
                data = {};
                for (var profileField in originalData)
                    if (Object.prototype.hasOwnProperty.call(originalData, profileField) && profileField !== 'publicStats')
                        data[profileField] = originalData[profileField];
            }
            return setPublicRoleData.call(this, data);
        };
        RoleData.prototype.__nhPublicProfile = true;
    }
    if (typeof RoleData !== 'undefined' && RoleData.prototype && !RoleData.prototype.__nhGradeCaps) {
        var gradeText = RoleData.prototype.upTxt, gradePercent = RoleData.prototype.getPtPercent, gradeThreshold = RoleData.prototype.getPtUpVals;
        RoleData.prototype.upTxt = function (hid) {
            if (gradeLimitReached(this, hid))
                return ['Maximum grade', '', ''];
            var definition = Config.getInstance().roleObject[this.getRoleID(hid)];
            if (laboratoryRules && definition && (Number(definition.quality) >= 7 || Number(this.getSlv(hid) || 0) >= 5))
                return ['Grade limit: 4 stars', '', ''];
            return gradeText.apply(this, arguments);
        };
        RoleData.prototype.getPtPercent = function (hid) { return gradeLimitReached(this, hid) ? 100 : gradePercent.apply(this, arguments); };
        RoleData.prototype.getPtUpVals = function (hid) { return gradeLimitReached(this, hid) ? 0 : gradeThreshold.apply(this, arguments); };
        RoleData.prototype.__nhGradeCaps = true;
    }
    if (typeof ShiYanShiScene !== 'undefined' && ShiYanShiScene.prototype && !ShiYanShiScene.prototype.__nhGradeProgress) {
        var makeGradeBar = ShiYanShiScene.prototype.createProgressBar;
        ShiYanShiScene.prototype.createProgressBar = function (quality, hid) {
            var result = makeGradeBar.apply(this, arguments);
            if (gradeLimitReached(RoleData.getInstance(), hid) && this.loadingBarTF)
                this.loadingBarTF.setString('Maximum grade');
            return result;
        };
        ShiYanShiScene.prototype.__nhGradeProgress = true;
    }
    if (typeof WenQuanScene !== 'undefined' && WenQuanScene.prototype && !WenQuanScene.prototype.__nhPracticeSettlement) {
        var hasPracticeNinja = function () {
            var practice = PracInfoData.getInstance();
            return (Number(practice.ptype) === 0 || Number(practice.ptype) === 1) &&
                Number(practice.hid) > 0 && !!RoleData.getInstance().heros[practice.hid];
        };
        // Recovered2942 equates a zero timer with an absent session, although the
        // server retains a finished bath until claim. It can also see the old timer
        // while pracInfo and buildings are being reduced from the same packet.
        var removePractice = WenQuanScene.prototype.removemyPaoWenquan;
        if (removePractice)
            WenQuanScene.prototype.removemyPaoWenquan = function () {
                if (hasPracticeNinja())
                    return;
                return removePractice.apply(this, arguments);
            };
        var updatePracticeBuilding = WenQuanScene.prototype.buildDataChange;
        if (updatePracticeBuilding)
            WenQuanScene.prototype.buildDataChange = function () {
                var result = updatePracticeBuilding.apply(this, arguments);
                if (hasPracticeNinja()) {
                    this.pracInfoDataChange();
                    this.showBtn(false);
                    this.lijijieshu.setVisible(true);
                    this.bgContainer.setVisible(true);
                    this.cdTF.setVisible(true);
                }
                return result;
            };
        var renderPractice = WenQuanScene.prototype.myPaoWenquan;
        if (renderPractice)
            WenQuanScene.prototype.myPaoWenquan = function (animate, hid) {
                var info = PracInfoData.getInstance();
                if (hid === undefined || hid === null)
                    hid = Number(info.ptype) >= 0 ? info.hid : RoleData.getInstance().getCurrentKey();
                return renderPractice.call(this, animate, hid);
            };
        // 2954 hid the selected ninja before the server accepted a start. The
        // authoritative pracInfo callback2945 now places it in the water instead.
        WenQuanScene.prototype.check = function (ptype) {
            if (this.__nhPracticePending)
                return;
            if (hasPracticeNinja()) {
                this.pracInfoDataChange();
                return;
            }
            var roles = RoleData.getInstance(), hid = roles.getCurrentKey(), hero = roles.heros[hid];
            var limit = Math.min(150, Number(UserData.getInstance().lv));
            if (!hero)
                return;
            if (Number(hero.lv) >= limit) {
                PromptView.setPageView(null);
                PromptBox.getInstance().updataTxt(limit >= 150 ? 'This ninja is already level 150. Choose a lower-level ninja for Hot Spring.' : 'Choose a lower-level ninja or raise your village level first.');
                return;
            }
            var cost = BuildData.getInstance().getFuncCost(this.buildingID, ptype);
            if (!UserData.getInstance().moneyEnough(cost.count, cost.id))
                return;
            this.__nhPracticePending = true;
            return this.send('practise', ptype);
        };
        // 2939 and 2944 used to clear ptype before the server accepted completion.
        // Keep the session visible until operation 9 confirms the actual reward.
        WenQuanScene.prototype.onTipEndPractise = function () {
            return this.send('endPractise', BuildData.getInstance().getCD(this.buildingID, 0));
        };
        WenQuanScene.prototype.cdChange = function () {
            var remaining = BuildData.getInstance().getCD(this.buildingID, 0), practice = PracInfoData.getInstance();
            this.cdTF.setString((Config.getInstance().textObject[3135] || 'My Hot Spring: ') + GameTools.getInstance().getTimes(remaining));
            if (remaining <= 0 && practice.ptype !== -1 && PromptView.page !== 'tip' && PromptView.page !== 'loading')
                PromptView.setPageView('tip', { tid: 3022, list: [], target: this, fun: 'onTipEndPractise' });
        };
        var touchPractice = WenQuanScene.prototype.onTouchesEnded;
        if (touchPractice)
            WenQuanScene.prototype.onTouchesEnded = function (touches) {
                var hit = GameTools.getInstance().onTouchesHit(touches[0], this.toucheList);
                if (hasPracticeNinja() && BuildData.getInstance().getCD(this.buildingID, 0) <= 0 && hit && hit === this.lastTouchTarget && hit._ty === 'lijijieshu') {
                    hit.setColor(GameTools.getInstance().get_BNT_C3b_255());
                    PromptView.setPageView('tip', { tid: 3022, list: [], target: this, fun: 'onTipEndPractise' });
                    return;
                }
                return touchPractice.apply(this, arguments);
            };
        var finishPractice = WenQuanScene.prototype.operResultDataChange;
        WenQuanScene.prototype.operResultDataChange = function () {
            var operation = OperResultData.getInstance(), shine = PracInfoData.getInstance().shine, result = finishPractice.apply(this, arguments);
            // 2958 clears shine together with the caller's bath, but another player's
            // authoritative premium interval may still be active in this realm.
            if (Number(operation.type) === 9 && Number(operation.res) === 0)
                PracInfoData.getInstance().shine = shine;
            if (Number(operation.type) === 9 && Number(operation.res) === 0 && operation.param && typeof operation.param.exp === 'number')
                PromptBox.getInstance().updataTxt(operation.param.completed ? 'Earned ' + operation.param.exp + ' EXP.' : 'Hot Spring ended early. No EXP earned.');
            return result;
        };
        WenQuanScene.prototype.__nhPracticeSettlement = true;
    }
    if (typeof TongLingXueYuanScene !== 'undefined' && TongLingXueYuanScene.prototype && !TongLingXueYuanScene.prototype.__nhPaidAdvanced) {
        var beginSummon = TongLingXueYuanScene.prototype.startGO;
        TongLingXueYuanScene.prototype.startGO = function () {
            if (lessonPending) {
                restoreLesson();
                return;
            }
            return beginSummon.apply(this, arguments);
        };
        var summonCooldown = TongLingXueYuanScene.prototype.cdChange;
        TongLingXueYuanScene.prototype.cdChange = function () {
            var result = summonCooldown.apply(this, arguments), building = BuildData.getInstance();
            var remaining = building.getNum(this.buildingID), total = building.gratisFrequency(this.buildingID, 0);
            var cooldown = building.getCD(this.buildingID, 0), cost = building.getFuncCost(this.buildingID, 1);
            // The timer and daily quota are independent. Legacy1909 promises another
            // free draw after the timer even when today's only free draw was spent.
            this.chujiTF.setString('Daily free: ' + remaining + '/' + total + (cooldown > 0 ? ' | CD ' + GameTools.getInstance().getTimes(cooldown) : ''));
            if (typeof this.chujiTF.setFontSize === 'function')
                this.chujiTF.setFontSize(14);
            // Legacy1909 advertises a free advanced draw when nonexistent cd[2]=0.
            this.gaojixuexiSHowButton.showTF(true);
            this.gaojiTF.setString(String(cost.count) + ' gold');
            return result;
        };
        TongLingXueYuanScene.prototype.__nhPaidAdvanced = true;
    }
    if (typeof NinJaSchoolScene !== 'undefined' && NinJaSchoolScene.prototype && !NinJaSchoolScene.prototype.__nhPendingLesson) {
        var beginLesson = NinJaSchoolScene.prototype.xuexi;
        NinJaSchoolScene.prototype.xuexi = function () {
            if (lessonPending) {
                restoreLesson();
                return;
            }
            return beginLesson.apply(this, arguments);
        };
        var lessonCooldown = NinJaSchoolScene.prototype.cdChange;
        if (typeof lessonCooldown === 'function')
            NinJaSchoolScene.prototype.cdChange = function () {
                var result = lessonCooldown.apply(this, arguments), building = BuildData.getInstance();
                var remaining = building.getNum(this.buildingID), total = building.gratisFrequency(this.buildingID, 0);
                var cooldown = building.getCD(this.buildingID, 0);
                //3228 has the same exhausted-quota promise as Summon School1909.
                //Keep its actual free/paid button choice, but describe quota separately.
                this.chujiTF.setString('Daily free: ' + remaining + '/' + total + (cooldown > 0 ? ' | CD ' + GameTools.getInstance().getTimes(cooldown) : ''));
                if (typeof this.chujiTF.setFontSize === 'function')
                    this.chujiTF.setFontSize(14);
                return result;
            };
        NinJaSchoolScene.prototype.__nhPendingLesson = true;
    }
    if (typeof LaMianGuanScene !== 'undefined' && LaMianGuanScene.prototype && !LaMianGuanScene.prototype.__nhRobberyCooldown) {
        var startRamenTouch = LaMianGuanScene.prototype.onTouchesBegan;
        LaMianGuanScene.prototype.onTouchesBegan = function (touches) {
            var hit = GameTools.getInstance().onTouchesHit(touches[0], this.toucheList);
            if (hit && (hit._ty === '0' || hit._ty === '1' || hit._ty === '2')) {
                var remaining = BuildData.getInstance().getCD(this.buildingID, 0);
                if (ramenClaimPending || remaining > 0) {
                    this.touchTarget = null;
                    PromptBox.getInstance().updataTxt(ramenClaimPending ? 'Waiting for the Ramen reward.' : 'Next Ramen robbery in ' + GameTools.getInstance().getTimes(remaining) + '.');
                    return;
                }
            }
            return startRamenTouch.apply(this, arguments);
        };
        LaMianGuanScene.prototype.__nhRobberyCooldown = true;
    }
    if (typeof HomeScene !== 'undefined' && HomeScene.prototype && !HomeScene.prototype.__nhHomeCoins) {
        var dropHomeCoins = HomeScene.prototype.dropMoney;
        HomeScene.prototype.dropMoney = function () {
            var prompt = PromptBox.getInstance(), text = prompt.updataTid;
            prompt.updataTid = function (id) { if (Number(id) !== 1009)
                return text.apply(this, arguments); };
            try {
                return dropHomeCoins.apply(this, arguments);
            }
            finally {
                prompt.updataTid = text;
            }
        };
        HomeScene.prototype.__nhHomeCoins = true;
    }
    if (typeof WaBaoScene !== 'undefined' && WaBaoScene.prototype && !WaBaoScene.prototype.__nhTreasureSettlement) {
        var treasureSend = WaBaoScene.prototype.send, treasureTouch = WaBaoScene.prototype.onTouchesEnded;
        var collectTreasure = WaBaoScene.prototype.call_fun_mov, treasureConfirm = WaBaoScene.prototype.digConfirm;
        WaBaoScene.prototype.send = function (command, payload) {
            var scene = this;
            this.__nhTreasureDisposed = false;
            if (command === 'dig') {
                if (treasureStartScene || treasureClaimPending || treasureReadScene)
                    return;
                if (!treasureKnown) {
                    // A disconnected claim may already have committed. Never interpret
                    // the cached round as permission to charge for a new paid game.
                    return readTreasure(this);
                }
                if (this.__nhTreasureRetry && this.__nhTreasureCollected)
                    return this.send('endDig', this.__nhTreasureCollected.hits);
                var intent = this.__nhTreasureStartIntent || { roundId: treasureRound ? treasureRound.id : null, maxGold: 0 };
                delete this.__nhTreasureStartIntent;
                this.__nhTreasureSendingIntent = intent;
                this.__nhTreasureRequestedRoundId = intent.roundId;
                treasureStartScene = this;
                try {
                    return handoffTreasure(this, command, function () { return treasureSend.call(scene, command, payload); });
                }
                finally {
                    delete this.__nhTreasureSendingIntent;
                }
            }
            if (command !== 'endDig')
                return treasureSend.apply(this, arguments);
            if (!treasureKnown) {
                if (!treasureReadScene)
                    return readTreasure(this);
                return;
            }
            if (!this.__nhTreasurePlayedRoundId || treasureClaimPending || treasureReadScene)
                return;
            var claim = { roundId: this.__nhTreasurePlayedRoundId, hits: payload.slice(0) }, sequence = ++treasureClaimSequence;
            var wait = treasureRound && treasureRound.id === claim.roundId ? Math.max(0, treasureReadyAt - Date.now()) : 0;
            this.__nhTreasureCollected = claim;
            this.__nhTreasureRetry = false;
            treasureClaimPending = true;
            treasureClaimScene = this;
            treasureClaimId = claim.roundId;
            PromptView.setPageView('loading');
            var sendClaim = function () {
                if (sequence !== treasureClaimSequence)
                    return;
                // The played scene owns the quote. A different device's B snapshot
                // must never relabel A's collected hits as a claim for B.
                handoffTreasure(scene, command, function () { return treasureSend.call(scene, command, claim); });
            };
            var scheduler = this.rootNode || this;
            if (wait > 0 && scheduler.scheduleOnce)
                scheduler.scheduleOnce(sendClaim, (wait + 50) / 1000);
            else
                sendClaim();
        };
        var startTreasureResult = WaBaoScene.prototype.onChangeOperResult;
        WaBaoScene.prototype.onChangeOperResult = function () {
            if (Number(OperResultData.getInstance().type) === 4) {
                if (!treasureRound || !treasureReceiptRoundId || treasureRound.id !== treasureReceiptRoundId) {
                    if (!treasureStartScene)
                        OperResultData.getInstance().removeEventListener(EventType.EVENT_CHANGE, this, 'onChangeOperResult');
                    if (!treasureClaimPending && !treasureStartScene && this.__nhTreasurePlayedRoundId !== (treasureRound && treasureRound.id)) {
                        if (PromptView.page === 'loading')
                            PromptView.setPageView(null);
                        this.showMenu(true);
                        this.setEnabledAll(true);
                    }
                    return;
                }
                this.__nhTreasurePlayedRoundId = treasureReceiptRoundId;
                this.__nhTreasureCollected = null;
                this.__nhTreasureRetry = false;
            }
            return startTreasureResult.apply(this, arguments);
        };
        WaBaoScene.prototype.call_fun_mov = function () {
            // Callback 3279 calculates a local preview and displays it immediately.
            // Retain its animation cleanup, but show rewards only after op5 succeeds.
            var prompt = PromptView.setPageView;
            PromptView.setPageView = function (page, data) {
                if (page !== 'gainItem')
                    return prompt.call(this, page, data);
            };
            try {
                return collectTreasure.apply(this, arguments);
            }
            finally {
                PromptView.setPageView = prompt;
            }
        };
        WaBaoScene.prototype.onTouchesEnded = function () {
            if (!treasureRound) {
                var scene = this, show = PromptView.setPageView;
                var observe = function (page, options) {
                    if (page === 'tip' && options && options.target === scene && options.fun === 'digConfirm')
                        scene.__nhTreasurePromptIntent = { roundId: null, maxGold: Number(options.list && options.list[0]) };
                    return show.apply(this, arguments);
                };
                PromptView.setPageView = observe;
                try {
                    return treasureTouch.apply(this, arguments);
                }
                finally {
                    if (PromptView.setPageView === observe)
                        PromptView.setPageView = show;
                }
            }
            // A resumed round is already paid. Keep the original hit testing, while
            // bypassing its free-count/cooldown prompt only for this synchronous call.
            var buildings = BuildData.getInstance(), count = buildings.getNum, cooldown = buildings.getCD_Idx;
            buildings.getNum = function (id) { return Number(id) === 4 ? 1 : count.apply(this, arguments); };
            buildings.getCD_Idx = function (id) { return Number(id) === 4 ? 0 : cooldown.apply(this, arguments); };
            try {
                return treasureTouch.apply(this, arguments);
            }
            finally {
                buildings.getNum = count;
                buildings.getCD_Idx = cooldown;
            }
        };
        WaBaoScene.prototype.digConfirm = function () {
            // A displayed paid confirmation keeps its original no-round quote even
            // if another device starts B while the dialog remains visible.
            if (this.__nhTreasurePromptIntent) {
                this.__nhTreasureStartIntent = this.__nhTreasurePromptIntent;
                delete this.__nhTreasurePromptIntent;
                try {
                    return treasureConfirm.apply(this, arguments);
                }
                finally {
                    delete this.__nhTreasureStartIntent;
                }
            }
            if (treasureRound)
                return this.send('dig');
            this.__nhTreasureStartIntent = { roundId: null, maxGold: Number(BuildData.getInstance().getFuncCost(4, 0).count) };
            try {
                return treasureConfirm.apply(this, arguments);
            }
            finally {
                delete this.__nhTreasureStartIntent;
            }
        };
        var exitTreasure = WaBaoScene.prototype.onRemoveMe;
        if (typeof exitTreasure === 'function')
            WaBaoScene.prototype.onRemoveMe = function () {
                this.__nhTreasureDisposed = true;
                if (treasureStartScene === this || treasureReadScene === this || treasureClaimScene === this)
                    releaseTreasure(false, true);
                return exitTreasure.apply(this, arguments);
            };
        for (var tl = 0, treasureLife = ['onclose', 'onerror', 'sessionClose', 'reconnect', 'login']; tl < treasureLife.length; tl++)
            (function (name) {
                var original = GameConnection[name];
                if (typeof original === 'function')
                    GameConnection[name] = function () {
                        releaseTreasure(true, true);
                        return original.apply(this, arguments);
                    };
            })(treasureLife[tl]);
        WaBaoScene.prototype.__nhTreasureSettlement = true;
    }
    if (typeof PromptView !== 'undefined' && !PromptView.__nhBeastPrice) {
        var showPrompt = PromptView.setPageView;
        PromptView.setPageView = function (page, data) {
            if (page === 'tip' && data && data.fun === 'onTip_BeastFight') {
                if (!beastAttacksOpen())
                    return closedBeastAttack();
                // The recovered formatter treats numeric zero as a missing value.
                // Render this configurable price explicitly, including a free skip.
                var cost = BuildData.getInstance().getFuncCost(13).count;
                data.txt = String(Config.getInstance().textObject[3057]).replace(/\{0\}/g, String(cost));
            }
            return showPrompt.call(this, page, data);
        };
        PromptView.__nhBeastPrice = true;
    }
    if (typeof HuoDongScene !== 'undefined' && HuoDongScene.prototype && !HuoDongScene.prototype.__nhBeastResults) {
        var dailyEntrance = HuoDongScene.prototype.showEntranceLayer;
        HuoDongScene.prototype.showEntranceLayer = function (index) {
            // Recovered2527 normally requires beastOpen==1 even to read rankings.
            // Keep the attack flag closed; only this daily-event entrance changes.
            if (this.contentList[index] === 'weishaozhinu' && !beastAttacksOpen() && beastResultsAvailable() &&
                typeof UserData !== 'undefined' && Number(UserData.getInstance().lv) >= 20) {
                MainView.setPageView('13');
                if (typeof AudioEngine !== 'undefined')
                    AudioEngine.getInstance().playerEffectSound('japaneseknock');
                return;
            }
            return dailyEntrance.apply(this, arguments);
        };
        HuoDongScene.prototype.__nhBeastResults = true;
    }
    // Legacy code checks the paid skip price even for a ready/free raid attack.
    if (typeof HDWeiShouScene !== 'undefined' && HDWeiShouScene.prototype && !HDWeiShouScene.prototype.__nhFreeRaid) {
        var paidBeastFight = HDWeiShouScene.prototype.onTip_BeastFight;
        HDWeiShouScene.prototype.onTip_BeastFight = function () {
            // A paid confirmation may remain open after the lethal attack arrives.
            // Recovered3466 does not recheck the event flag before entering gameLoad.
            if (!beastAttacksOpen()) {
                syncBeastControls(this);
                return closedBeastAttack();
            }
            if (BuildData.getInstance().getCD(this.buildingID, 0) > 0)
                return paidBeastFight.apply(this, arguments);
            GameData.getInstance().sockentType = 'beastFight';
            GameData.getInstance().sockentData = 1;
            MainView.setPageView('gameLoad');
        };
        HDWeiShouScene.prototype.__nhFreeRaid = true;
    }
    if (typeof HDWeiShouScene !== 'undefined' && HDWeiShouScene.prototype && !HDWeiShouScene.prototype.__nhClosedRaidControls) {
        var beastPlayerChanged = HDWeiShouScene.prototype.userDataChange, beastCooldownChanged = HDWeiShouScene.prototype.cdChange;
        HDWeiShouScene.prototype.userDataChange = function () {
            var result = beastPlayerChanged.apply(this, arguments);
            syncBeastControls(this);
            return result;
        };
        HDWeiShouScene.prototype.cdChange = function () {
            var result = beastCooldownChanged.apply(this, arguments);
            // Recovered3458 otherwise shows the paid cooldown even after death.
            syncBeastControls(this);
            return result;
        };
        HDWeiShouScene.prototype.__nhClosedRaidControls = true;
    }
    // Layar Tailed Beast baru membangun avatar & melepas layar redup di beastOrderDataChange, yaitu hanya saat
    // ada push beastOrder baru. Tanpa ini scene menunggu siaran server berikutnya (10-15 dtk) setelah dibuka.
    // Minta ranking/roleList sekarang juga begitu scene dibuat; balasan server hanya beberapa milidetik.
    if (typeof HDWeiShouScene !== 'undefined' && HDWeiShouScene.prototype && !HDWeiShouScene.prototype.__nhFastOrder) {
        var beastInitUI = HDWeiShouScene.prototype.initUI;
        HDWeiShouScene.prototype.initUI = function () {
            var result = beastInitUI.apply(this, arguments);
            try {
                if (typeof GameConnection !== 'undefined' && typeof GameConnection.send === 'function')
                    GameConnection.send('requestBeastOrder', 1);
            }
            catch (e) { }
            return result;
        };
        HDWeiShouScene.prototype.__nhFastOrder = true;
    }
    // The open mailbox keeps references to sysMails/priMails. Legacy setObj
    // replaces those arrays on a full snapshot, leaving the visible list stale.
    // Preserve their identity so online deliveries and server resyncs render.
    if (typeof EmailData !== 'undefined' && EmailData.prototype && !EmailData.prototype.__nhStableLists) {
        var setMailObject = EmailData.prototype.setObj;
        EmailData.prototype.setObj = function (data) {
            var system = this.sysMails, privateMail = this.priMails;
            var result = setMailObject.apply(this, arguments);
            if (system && system !== this.sysMails) {
                system.length = 0;
                for (var mi = 0; mi < this.sysMails.length; mi++)
                    system.push(this.sysMails[mi]);
                this.sysMails = system;
            }
            if (privateMail && privateMail !== this.priMails) {
                privateMail.length = 0;
                for (var pi = 0; pi < this.priMails.length; pi++)
                    privateMail.push(this.priMails[pi]);
                this.priMails = privateMail;
            }
            return result;
        };
        EmailData.prototype.__nhStableLists = true;
    }
    // Recovered4120 strips the mail-only h prefix but then reads the quantity
    // using the stripped key. Normalize a display copy, preserving stored mail
    // data and the server's established h<ID> wire contract.
    if (typeof EmailInbox !== 'undefined' && EmailInbox.prototype && !EmailInbox.prototype.__nhGiftQuantity) {
        var showGiftMail = EmailInbox.prototype.showText;
        EmailInbox.prototype.showText = function (mail) {
            if (!mail || !mail.w)
                return showGiftMail.apply(this, arguments);
            var display = {}, rewards = {};
            for (var mk in mail)
                if (Object.prototype.hasOwnProperty.call(mail, mk))
                    display[mk] = mail[mk];
            for (var wk in mail.w)
                if (Object.prototype.hasOwnProperty.call(mail.w, wk)) {
                    var displayKey = /^h[0-9]+$/.test(wk) ? wk.substring(1) : wk;
                    rewards[displayKey] = (rewards[displayKey] || 0) + mail.w[wk];
                }
            display.w = rewards;
            return showGiftMail.call(this, display);
        };
        EmailInbox.prototype.__nhGiftQuantity = true;
    }
    // The one-ninja animation4193 has no quantity field. Multiple copies of one
    // role use the existing mixed-reward popup2858, which displays "Name X10".
    // Preserve the original batch-display gate and one-copy animation.
    if (typeof PropertyTools !== 'undefined' && typeof PropertyTools.gainItem === 'function' && !PropertyTools.__nhGiftQuantity) {
        var showGainedItem = PropertyTools.gainItem;
        PropertyTools.gainItem = function (rewards) {
            var keys = [];
            for (var rewardKey in rewards)
                if (Object.prototype.hasOwnProperty.call(rewards, rewardKey))
                    keys.push(rewardKey);
            if (keys.length === 1 && Number(rewards[keys[0]]) > 1 && Config.getInstance().roleObject[keys[0]]) {
                InventoryData.getInstance().isRenzheType = false;
                this.isShowAllRequestMsg();
                if (InventoryData.getInstance().dataCancelShow === false)
                    return;
                PromptView.setPageView('gainItem', rewards);
                return false;
            }
            return showGainedItem.apply(this, arguments);
        };
        PropertyTools.__nhGiftQuantity = true;
    }
    // A rejected battle never produces GameData, so the original loading scene
    // waits forever. Handle explicit server errors before legacy success-only
    // callbacks see an operation packet with a missing result payload.
    if (typeof GameConnection !== 'undefined' && !GameConnection.__nhErrors) {
        var sendGameMessage = GameConnection.send;
        GameConnection.send = function (command, payload) {
            var pendingToken = null;
            if (command === 'takeForce') {
                if (ramenClaimPending)
                    return;
                ramenClaimPending = pendingToken = {};
            }
            if ((command === 'beastInject' || command === 'studySkill') && lessonPending) {
                restoreLesson();
                return;
            }
            if (command === 'replaceSkill' || command === 'giveupSkill') {
                if (skillDecisionPending)
                    return;
                if (!altarPending && !lessonPending) {
                    PromptView.setPageView(null);
                    ContentView.setPageView(null);
                    return;
                }
                skillDecisionPending = pendingToken = {};
            }
            if (command === 'dig' && treasureClaimPending)
                return;
            if (command === 'dig' && treasureStartScene && treasureStartScene.__nhTreasureSendingIntent)
                payload = treasureStartScene.__nhTreasureSendingIntent;
            if (command === 'endDig' && Object.prototype.toString.call(payload) === '[object Array]') {
                var played = typeof MainView !== 'undefined' && MainView.currentPage && MainView.currentPage.__nhTreasurePlayedRoundId;
                if (!played)
                    return;
                payload = { roundId: played, hits: payload.slice(0) };
            }
            if (command === 'beastFight' && beastConfig)
                payload = { eventId: beastConfig.eventId, skipGold: beastConfig.skipGold };
            if ((command === 'buyShopItem' || command === 'refreshTypeShop') && shopRules && payload) {
                var quoted = {};
                for (var sk in payload)
                    if (Object.prototype.hasOwnProperty.call(payload, sk))
                        quoted[sk] = payload[sk];
                quoted.revision = shopRules.randomRevisions[String(payload.type)];
                payload = quoted;
            }
            if (command === 'costumeUpgrade' && costumeRules && CostumeData.getInstance().getLevel(payload.id) >= costumeRules.maximumLevel) {
                PromptView.setPageView(null);
                PromptBox.getInstance().updataTxt('Costume is at maximum level.');
                return;
            }
            if (!pendingToken)
                return sendGameMessage.call(this, command, payload);
            var session = GameConnection.session, transportSend = session && session.send, handedOff = false;
            var observe = function (event) {
                var result = transportSend.apply(this, arguments);
                if (event && event.source && Object.prototype.hasOwnProperty.call(event.source, command))
                    handedOff = true;
                return result;
            };
            if (typeof transportSend === 'function')
                session.send = observe;
            try {
                return sendGameMessage.call(this, command, payload);
            }
            finally {
                if (session && session.send === observe)
                    session.send = transportSend;
                //341 silently returns without a session and swallows transport errors.
                //Only a real handoff waits for ACK; buffered sends remain in flight.
                if (!handedOff) {
                    if (ramenClaimPending === pendingToken)
                        ramenClaimPending = false;
                    if (skillDecisionPending === pendingToken)
                        skillDecisionPending = false;
                }
            }
        };
        var receiveGameMessage = GameConnection.onmessage;
        GameConnection.onmessage = function (message) {
            if (message && message.beastRules && typeof message.beastRules === 'object' && GameConnection.networkInstableState && !message.recoveryError) {
                // Keep the local receipt time with this deferred metadata. Anchoring
                // only when the player dismisses the network dialog would extend the
                // server's results window by the entire time spent waiting for OK.
                var bufferedBeast = {}, bufferedPacket = {};
                for (var br in message.beastRules)
                    if (Object.prototype.hasOwnProperty.call(message.beastRules, br))
                        bufferedBeast[br] = message.beastRules[br];
                bufferedBeast.__nhReceivedAt = Date.now();
                for (var bp in message)
                    if (Object.prototype.hasOwnProperty.call(message, bp))
                        bufferedPacket[bp] = message[bp];
                bufferedPacket.beastRules = bufferedBeast;
                message = bufferedPacket;
            }
            // Keep metadata and its reward popup attached to the original packet
            // until recovered354 flushes345's unstable-network queue.
            if (message && (message.treasureRules || message.practiceRules || message.costumeRules || message.chat || message.chatRefresh || message.chatReset || Object.prototype.hasOwnProperty.call(message, 'clanWarIdentity') || Object.prototype.hasOwnProperty.call(message, 'beastRules') || Object.prototype.hasOwnProperty.call(message, 'onboarding')) && GameConnection.networkInstableState && !message.recoveryError)
                return receiveGameMessage.call(this, message);
            var treasureSettlement = null;
            treasureReceiptRoundId = null;
            var localTaskSettlement = null, localTaskRefresh = false;
            var homeCoinSettlement = message && !message.recoveryError ? message.homeCoinReward : null;
            // nhPopup = popup yang tidak ada di klien bawaan: { sp: n } -> toast "Get {0} specialization point";
            // { rewards: {id: n} } -> popup reward gainItem
            var nhPopup = message && !message.recoveryError ? message.nhPopup : null;
            var beastRefresh = !!(message && (Object.prototype.hasOwnProperty.call(message, 'beastRules') ||
                message.chatReset || message.player && Object.prototype.hasOwnProperty.call(message.player, 'beastOpen')));
            if (beastRefresh)
                beastResultsExpiresAt = 0;
            if (message && message.chatReset)
                beastConfig = null;
            if (message && message.chatReset) {
                altarPending = lessonPending = null;
                skillDecisionPending = ramenClaimPending = false;
                releaseTreasure(true, true);
            }
            if (message && message.skillLesson) {
                lessonPending = message.skillLesson.pending || null;
                skillDecisionPending = false;
                if (lessonPending)
                    altarPending = null;
            }
            if (message && message.operResult && Number(message.operResult.type) === 20)
                ramenClaimPending = false;
            if (message && message.chatReset) {
                coreOnboardingCompleted = false;
                pendingCoreLesson = null;
            }
            if (message && Object.prototype.hasOwnProperty.call(message, 'onboarding')) {
                var onboarding = message.onboarding && message.onboarding.version === 1 ? message.onboarding : null;
                coreOnboardingCompleted = !!(onboarding && onboarding.coreCompleted === true);
                pendingCoreLesson = onboarding && onboarding.pendingLesson === 'rasengan' ? 'rasengan' : null;
            }
            if (message && message.localTaskRules) {
                localTaskConfig = message.localTaskRules;
                localTaskClaimPending = false;
                localTaskRefresh = true;
                if (typeof Config !== 'undefined')
                    Config.getInstance().textObject[7110] = localTaskConfig.prompt;
                if (!localTaskConfig.adsEnabled)
                    disableLocalAds();
                if (!message.recoveryError)
                    localTaskSettlement = localTaskConfig.settled;
            }
            if (message && message.treasureRules) {
                var nextRound = message.treasureRules.currentRound || null, settlement = message.treasureRules.settled;
                treasureReceiptRoundId = message.operResult && Number(message.operResult.type) === 4
                    ? (Object.prototype.hasOwnProperty.call(message.treasureRules, 'receiptRoundId') ? message.treasureRules.receiptRoundId : nextRound && nextRound.id) : null;
                // A same-round read is not an acknowledgement. Preserve its pending
                // minimum-duration timer and single in-flight claim.
                if (treasureClaimPending && (!nextRound || nextRound.id !== treasureClaimId ||
                    settlement && settlement.roundId === treasureClaimId))
                    releaseTreasure(true, false);
                if (treasureReadScene) {
                    treasureReadScene = null;
                    if (PromptView.page === 'loading')
                        PromptView.setPageView(null);
                }
                if (message.operResult && Number(message.operResult.type) === 4 &&
                    (nextRound && nextRound.id === treasureReceiptRoundId || treasureStartScene &&
                        (treasureStartScene.__nhTreasureRequestedRoundId === null || treasureStartScene.__nhTreasureRequestedRoundId === treasureReceiptRoundId)))
                    treasureStartScene = null;
                treasureKnown = true;
                treasureRound = nextRound;
                treasureReadyAt = Date.now() + (treasureRound ? Math.max(0, Number(treasureRound.waitMs) || 0) : 0);
                if (typeof MainView !== 'undefined' && MainView.currentPage && Number(MainView.currentPage.buildingID) === 4)
                    syncTreasureRetry(MainView.currentPage);
                if (message.treasureRules.settled && message.operResult && Number(message.operResult.type) === 5 && Number(message.operResult.res) === 0 && !message.recoveryError) {
                    treasureSettlement = message.treasureRules.settled;
                }
                if (typeof Config !== 'undefined') {
                    Config.getInstance().textObject[3095] = 'Tap each appearing ninja once to collect its item. Each round has 20 appearances. Five free rounds reset daily at midnight WIB, with 5 minutes between free starts. Additional rounds cost 50 gold. Closing the game keeps your active round so you can resume without paying again.';
                    Config.getInstance().textObject[3096] = 'Rewards are silver and materials from the Whack A Ninja reward pool. Each round has one weighted reward offer and 19 ordinary offers. Rewards are credited only after the server confirms the round.';
                }
            }
            if (message && message.chatReset) {
                homeCoinSeen = {};
                homeCoinOrder = [];
                chatSeen = {};
                chatOrder = [];
                chatRefreshRevision = chatRefreshThroughId = 0;
                if (typeof ChatData !== 'undefined') {
                    var chatData = ChatData.getInstance(), lists = ['list', 'last_list', 'worldTalks', 'sysTalks', 'teamTalks'];
                    for (var cl = 0; cl < lists.length; cl++) {
                        if (chatData[lists[cl]])
                            chatData[lists[cl]].length = 0;
                        else
                            chatData[lists[cl]] = [];
                    }
                    chatData.index = chatData.curWorldTalkId = chatData.curSysTalkId = chatData.curTeamTalkId = 0;
                }
            }
            if (message && message.chatRefresh && typeof ChatData !== 'undefined') {
                var refresh = message.chatRefresh;
                if (typeof refresh.revision === 'number' && refresh.revision > chatRefreshRevision &&
                    typeof refresh.throughMessageId === 'number' && refresh.throughMessageId >= 0 &&
                    Object.prototype.toString.call(refresh.messages) === '[object Array]') {
                    chatRefreshRevision = refresh.revision;
                    chatRefreshThroughId = Math.max(chatRefreshThroughId, refresh.throughMessageId);
                    var refreshedChat = ChatData.getInstance(), refreshLists = ['list', 'last_list', 'worldTalks', 'sysTalks', 'teamTalks'];
                    var retained = {}, merged = [], refreshId, refreshRow;
                    // Keep system notices and every array identity. A live message newer
                    // than the SQL snapshot must survive the asynchronous refresh.
                    for (var rl = 0; rl < refreshLists.length; rl++) {
                        var rows = refreshedChat[refreshLists[rl]];
                        if (!rows) {
                            refreshedChat[refreshLists[rl]] = [];
                            continue;
                        }
                        for (var ri = rows.length - 1; ri >= 0; ri--) {
                            refreshRow = rows[ri];
                            if (Number(refreshRow.scope) !== 1 && Number(refreshRow.scope) !== 3)
                                continue;
                            if (Number(refreshRow.messageId) > refresh.throughMessageId)
                                retained[String(refreshRow.messageId)] = refreshRow;
                            rows.splice(ri, 1);
                        }
                    }
                    for (var rm = 0; rm < refresh.messages.length; rm++) {
                        refreshRow = refresh.messages[rm];
                        if (refreshRow && (Number(refreshRow.scope) === 1 || Number(refreshRow.scope) === 3) &&
                            Number(refreshRow.messageId) > 0 && Number(refreshRow.messageId) <= refresh.throughMessageId)
                            retained[String(refreshRow.messageId)] = refreshRow;
                    }
                    for (refreshId in retained)
                        if (Object.prototype.hasOwnProperty.call(retained, refreshId))
                            merged.push(retained[refreshId]);
                    merged.sort(function (a, b) { return Number(a.messageId) - Number(b.messageId); });
                    chatSeen = {};
                    chatOrder = [];
                    for (var mr = 0; mr < merged.length; mr++) {
                        refreshId = String(merged[mr].messageId);
                        chatSeen[refreshId] = true;
                        chatOrder.push(refreshId);
                        refreshedChat.setObj(merged[mr]);
                    }
                    // Notify once, including an empty snapshot after leaving a clan.
                    if (typeof refreshedChat.onDataChange === 'function')
                        refreshedChat.onDataChange();
                    if (typeof refreshedChat.dispatchEvents === 'function' && typeof EventType !== 'undefined')
                        refreshedChat.dispatchEvents(EventType.EVENT_CHANGE);
                }
            }
            if (message && message.chat && message.chat.messageId !== undefined) {
                var chatKey = String(message.chat.messageId), deduplicated = {};
                if (chatSeen[chatKey] || (Number(message.chat.scope) === 1 || Number(message.chat.scope) === 3) && Number(chatKey) <= chatRefreshThroughId) {
                    for (var ck in message)
                        if (Object.prototype.hasOwnProperty.call(message, ck) && ck !== 'chat')
                            deduplicated[ck] = message[ck];
                    message = deduplicated;
                }
                else {
                    chatSeen[chatKey] = true;
                    chatOrder.push(chatKey);
                    if (chatOrder.length > 500)
                        delete chatSeen[chatOrder.shift()];
                }
            }
            if (message && message.beastAltar) {
                altarPending = message.beastAltar.pending || null;
                skillDecisionPending = false;
                if (altarPending)
                    lessonPending = null;
            }
            if (message && message.shopRules)
                shopRules = message.shopRules;
            if (message && message.activityRules) {
                var activityConfig = Config.getInstance(), activityDefinitions = message.activityRules.definitions || [], giftOverrides = message.activityRules.giftTextOverrides || [];
                activityConfig.activityObject = activityConfig.activityObject || {};
                for (var ai = 0; ai < activityDefinitions.length; ai++)
                    activityConfig.activityObject[activityDefinitions[ai].id] = activityDefinitions[ai];
                for (var gi = 0; gi < giftOverrides.length; gi++) {
                    var giftDefinition = activityConfig.jingcaiHDObject && activityConfig.jingcaiHDObject[giftOverrides[gi].id];
                    if (giftDefinition)
                        giftDefinition.desc1 = giftOverrides[gi].desc1;
                }
            }
            if (message && message.player && message.player.giftStatus && typeof UserData !== 'undefined')
                UserData.getInstance().giftdata_now = null;
            if (message && message.practiceRules && typeof Config !== 'undefined') {
                Config.getInstance().textObject[3022] = 'Hot Spring completed. Claim your EXP.';
                Config.getInstance().textObject[3121] = 'Both Hot Spring courses last 8 hours. Basic costs 1,000 silver for 4,000 base EXP; premium costs 50 gold for 20,000 base EXP. Active premium baths add a realm-wide 20% EXP rate for their overlapping time, without stacking. Ending early grants no EXP and no refund.';
            }
            if (message && message.laboratoryRules) {
                laboratoryRules = message.laboratoryRules;
                Config.getInstance().textObject[3113] = 'Absorb reserve ninjas to gain EXP and grade points. Qualities 1-6 can advance one color and then four stars. SSS and UR can gain four stars. At maximum grade only EXP is gained.';
                Config.getInstance().textObject[3115] = 'Soul Fusion consumes an identical ninja. Fusion limits by base quality: 20 for qualities 1-3, 25 for qualities 4-5, and 30 for qualities 6-8.';
            }
            if (message && message.costumeRules) {
                costumeRules = message.costumeRules;
                var cfg = Config.getInstance(), materials = costumeRules.materials || [];
                cfg.materialObject = cfg.materialObject || {};
                cfg.itemObject = cfg.itemObject || {};
                for (var cm = 0; cm < materials.length; cm++) {
                    var material = {}, source = materials[cm];
                    for (var mk in source)
                        if (Object.prototype.hasOwnProperty.call(source, mk))
                            material[mk] = source[mk];
                    material.sell = { silver: 100 };
                    cfg.materialObject[material.id] = material;
                    cfg.itemObject[material.id] = material;
                }
            }
            if (message && Object.prototype.hasOwnProperty.call(message, 'beastRules')) {
                var rules = message.beastRules;
                beastConfig = null;
                // The recovered client only has decrementing building cooldowns, not
                // a server epoch clock. Anchor this server-provided duration locally
                // so a phone clock offset cannot prematurely hide the results.
                if (rules && rules.resultsAvailable === true && typeof rules.resultsUntil === 'number' && isFinite(rules.resultsUntil) &&
                    typeof rules.serverNow === 'number' && isFinite(rules.serverNow) && rules.serverNow > 0 && rules.resultsUntil > rules.serverNow)
                    beastResultsExpiresAt = Math.min(Date.now(), typeof rules.__nhReceivedAt === 'number' && isFinite(rules.__nhReceivedAt) ? rules.__nhReceivedAt : Date.now()) + (rules.resultsUntil - rules.serverNow);
                if (rules && typeof rules.skipGold === 'number' && rules.skipGold >= 0 && rules.skipGold <= 100000 &&
                    Math.floor(rules.skipGold) === rules.skipGold) {
                    beastConfig = rules;
                    if (typeof Config !== 'undefined' && Config.getInstance().buildingObject['13']) {
                        Config.getInstance().buildingObject['13'].funcCost = [{ id: 'gold', count: rules.skipGold }];
                        // Keep help consistent with the modern settlement timing.
                        Config.getInstance().textObject[3098] = 'Damage adds to your event score. When the Beast is defeated or time runs out, attacks stop and final rewards are processed by mail. Results remain viewable until the scheduled end. Top 5 players also receive Ten Tailed Chakra, a Beast Chakra Bag and a Class-UR Scroll.';
                    }
                }
            }
            var restoreSchoolPending = !!(message && message.skillLesson && lessonPending && !message.operResult && message.buildings);
            if (message && (Object.prototype.hasOwnProperty.call(message, 'beastRules') || message.beastAltar || message.skillLesson || message.costumeRules || message.shopRules || message.laboratoryRules || message.practiceRules || message.activityRules || message.treasureRules || message.localTaskRules || message.homeCoinReward || message.nhPopup || message.chatReset || message.chatRefresh || Object.prototype.hasOwnProperty.call(message, 'onboarding'))) {
                var legacyMessage = {};
                for (var field in message)
                    if (Object.prototype.hasOwnProperty.call(message, field) && field !== 'beastRules' && field !== 'beastAltar' && field !== 'skillLesson' && field !== 'costumeRules' && field !== 'shopRules' && field !== 'laboratoryRules' && field !== 'practiceRules' && field !== 'activityRules' && field !== 'treasureRules' && field !== 'localTaskRules' && field !== 'homeCoinReward' && field !== 'nhPopup' && field !== 'chatReset' && field !== 'chatRefresh' && field !== 'onboarding')
                        legacyMessage[field] = message[field];
                message = legacyMessage;
            }
            if (!message || !message.recoveryError) {
                var received = receiveGameMessage.call(this, message);
                if (restoreSchoolPending && typeof MainView !== 'undefined' && MainView.currentPage &&
                    (Number(MainView.currentPage.buildingID) === 2 || Number(MainView.currentPage.buildingID) === 5))
                    restoreLesson();
                if (message && message.pracInfo && typeof MainView !== 'undefined' && MainView.currentPage && Number(MainView.currentPage.buildingID) === 6 && MainView.currentPage.__nhPracticePending) {
                    MainView.currentPage.__nhPracticePending = false;
                    PromptView.setPageView(null);
                    MainView.currentPage.pracInfoDataChange();
                    MainView.currentPage.setEnabledAll(true);
                }
                if (beastRefresh && typeof MainView !== 'undefined' && MainView.currentPage && Number(MainView.currentPage.buildingID) === 13)
                    syncBeastControls(MainView.currentPage);
                if (homeCoinSettlement && homeCoinSettlement.id && Number(homeCoinSettlement.silver) > 0) {
                    var homeCoinKey = String(typeof UserData !== 'undefined' ? UserData.getInstance().id : '') + ':' + homeCoinSettlement.id;
                    if (!homeCoinSeen[homeCoinKey]) {
                        homeCoinSeen[homeCoinKey] = true;
                        homeCoinOrder.push(homeCoinKey);
                        if (homeCoinOrder.length > 100)
                            delete homeCoinSeen[homeCoinOrder.shift()];
                        PromptBox.getInstance().updataTid(1009, [Number(homeCoinSettlement.silver)]);
                    }
                }
                if (nhPopup) {
                    try {
                        if (Number(nhPopup.sp) > 0)
                            PromptBox.getInstance().updataTid(6012, [Number(nhPopup.sp)]);
                        // tids: [[textId, [args...]], ...] -> bubble teks standar (Config.textObject)
                        if (nhPopup.tids && nhPopup.tids.length)
                            for (var nhi = 0; nhi < nhPopup.tids.length; nhi++)
                                PromptBox.getInstance().updataTid(Number(nhPopup.tids[nhi][0]), nhPopup.tids[nhi][1] || []);
                        var nhRewards = nhPopup.rewards, nhHas = false;
                        for (var nhKey in nhRewards)
                            if (Object.prototype.hasOwnProperty.call(nhRewards, nhKey) && Number(nhRewards[nhKey]) > 0)
                                nhHas = true;
                        if (nhHas)
                            PromptView.setPageView('gainItem', nhRewards);
                    }
                    catch (popupError) {
                        if (typeof log === 'function')
                            log('NH_POPUP_FAILED');
                    }
                }
                if (treasureSettlement && !treasureSeen[treasureSettlement.roundId]) {
                    treasureSeen[treasureSettlement.roundId] = true;
                    treasureOrder.push(treasureSettlement.roundId);
                    if (treasureOrder.length > 100)
                        delete treasureSeen[treasureOrder.shift()];
                    var hasTreasure = false, rewards = treasureSettlement.rewards || {};
                    for (var reward in rewards)
                        if (Object.prototype.hasOwnProperty.call(rewards, reward) && Number(rewards[reward]) > 0)
                            hasTreasure = true;
                    PromptView.setPageView(hasTreasure ? 'gainItem' : null, hasTreasure ? rewards : undefined);
                    if (!hasTreasure && typeof MainView !== 'undefined' && MainView.currentPage && MainView.currentPage.setEnabledAll)
                        MainView.currentPage.setEnabledAll(true);
                }
                if (localTaskSettlement && !localTaskSeen[localTaskSettlement.claimId]) {
                    localTaskSeen[localTaskSettlement.claimId] = true;
                    localTaskOrder.push(localTaskSettlement.claimId);
                    if (localTaskOrder.length > 100)
                        delete localTaskSeen[localTaskOrder.shift()];
                    PromptView.setPageView('gainItem', localTaskSettlement.rewards);
                }
                else if (localTaskRefresh)
                    offerLocalTask();
                return received;
            }
            localTaskClaimPending = false;
            skillDecisionPending = ramenClaimPending = false;
            var failedTreasureScene = treasureClaimScene || treasureStartScene || treasureReadScene;
            var staleTreasure = message.recoveryError.code === 'TREASURE_ROUND_CHANGED' || message.recoveryError.code === 'TREASURE_PRICE_CHANGED' || message.recoveryError.code === 'TREASURE_ALREADY_CLAIMED';
            releaseTreasure(true, false);
            if (typeof GameConnection.__nhRecoverTrialPending === 'function')
                GameConnection.__nhRecoverTrialPending();
            if (typeof GameConnection.__nhRecoverRingPending === 'function')
                GameConnection.__nhRecoverRingPending();
            if (typeof GameConnection.__nhRecoverSupportPending === 'function')
                GameConnection.__nhRecoverSupportPending();
            GameConnection.dataReturn = true;
            if (typeof PromptView !== 'undefined')
                PromptView.setPageView(null);
            if (typeof MainView !== 'undefined') {
                if (MainView.page === 'gameLoad')
                    MainView.setPageView('home');
                if (MainView.setEnabledAll)
                    MainView.setEnabledAll(true);
                if (MainView.currentPage && MainView.currentPage.setEnabledAll)
                    MainView.currentPage.setEnabledAll(true);
                if (MainView.currentPage && Number(MainView.currentPage.buildingID) === 6 && MainView.currentPage.__nhPracticePending) {
                    MainView.currentPage.__nhPracticePending = false;
                    if (Number(PracInfoData.getInstance().ptype) < 0)
                        MainView.currentPage.tableCellTouched(RoleData.getInstance().getCurrentKey());
                }
                if (MainView.currentPage && Number(MainView.currentPage.buildingID) === 10) {
                    MainView.currentPage.moveBoon = false;
                    if (MainView.currentPage.showBtn)
                        MainView.currentPage.showBtn(true);
                    if (MainView.currentPage.onChangeRoleData)
                        MainView.currentPage.onChangeRoleData();
                }
            }
            if (typeof ContentView !== 'undefined' && ContentView.currentPage && ContentView.currentPage.setEnabledAll)
                ContentView.currentPage.setEnabledAll(true);
            if (typeof PromptBox !== 'undefined')
                PromptBox.getInstance().updataTxt(String(message.recoveryError.message || 'Unable to complete this action.'));
            if (staleTreasure && failedTreasureScene && !failedTreasureScene.__nhTreasureDisposed &&
                typeof MainView !== 'undefined' && MainView.currentPage === failedTreasureScene)
                readTreasure(failedTreasureScene);
        };
        for (var pl = 0, pendingLife = ['onclose', 'onerror', 'sessionClose', 'reconnect', 'login']; pl < pendingLife.length; pl++)
            (function (name) {
                var original = GameConnection[name];
                if (typeof original === 'function')
                    GameConnection[name] = function () {
                        //Release only local busy guards. Pending skill ownership and rewards
                        //remain authoritative; do not resend or infer rollback from disconnect.
                        skillDecisionPending = ramenClaimPending = false;
                        return original.apply(this, arguments);
                    };
            })(pendingLife[pl]);
        GameConnection.__nhErrors = true;
    }
    // Legacy initUI fills the default item before hiding the stat labels and
    // never selects its table row. Operation callback 2440 then dereferences
    // viewLabel.lastContent. Select the real rendered row after initialization;
    // this also restores the initial before/after preview without changing data.
    if (typeof EnhanceScene !== 'undefined' && EnhanceScene.prototype && !EnhanceScene.prototype.__nhInitialSelection) {
        var initialEnhanceUI = EnhanceScene.prototype.initUI;
        EnhanceScene.prototype.initUI = function () {
            var result = initialEnhanceUI.apply(this, arguments);
            var view = this.viewLabel;
            if (this.tab === 0 && view) {
                if (view.lastContent && view.lastContent.key)
                    this.table_call_fun(view.lastContent.key);
                else {
                    var cells = view.tableList || [];
                    for (var i = 0; i < cells.length; i++) {
                        var content = cells[i].getChildByTag(view.tag);
                        if (content && content.key && content.key.idx === 0) {
                            view.tableCellTouched(view.tableViews, cells[i]);
                            break;
                        }
                    }
                }
            }
            return result;
        };
        EnhanceScene.prototype.__nhInitialSelection = true;
    }
    if (typeof log === 'function')
        log('NH_LOCAL_BACKEND_ADAPTER_READY');
}());

"use strict";
// ── Multi-Deploy: 2 halaman papan Deploy (Line up) ───────────────────────────────────────────
// Server menyimpan heros.aidsPages / heros.aidsPage; heros.aids selalu = halaman aktif, jadi papan
// asli (getAids, power, combo) tidak berubah. Di sini hanya menambah tombol "Page 1 / Page 2" di
// scene papan (HouYuanTuanScene). Tombol ditekan -> kirim { page, aids: papan yang sedang tampil }
// lewat command `aidsPage`; server menyimpan papan itu ke halaman lama, lalu membalas heros halaman
// baru, dan papan digambar ulang.
function __NH_INSTALL_DEPLOY_PAGES() {
    if (typeof HouYuanTuanScene === 'undefined' || !HouYuanTuanScene.prototype || HouYuanTuanScene.prototype.__nhDeployPages)
        return;
    if (typeof GameConnection === 'undefined' || typeof GameConnection.handleGameCommand !== 'function' || typeof GameConnection.send !== 'function')
        return;
    var proto = HouYuanTuanScene.prototype, PAGES = 2, STALE_MS = 6000;
    // Tata letak: koordinat acuan dari screenshot layar Deploy 1771x992 (px), dikalibrasi dari 2 pengamatan nyata di perangkat
    // (closeHelpDx = jarak close-help dalam px screenshot; nilai 129 hasil kalibrasi, bukan ukur visual);
    // tombol berada di dalam kotak kosong di bawah daftar combo skill (kiri bawah). Posisi tombol dihitung relatif
    // terhadap closeBtn & helpBtn (jarak keduanya = skala), jadi tidak bergantung ukuran layar.
    // Ubah angka di sini kalau posisi/ukuran tombol mau digeser.
    var REF = { closeX: 1591, closeY: 54, closeHelpDx: 129, y: 934, xs: [358, 498], w: 123, h: 44 };
    var activePage = 0, pending = null, current = null, pages = null;   // pages = salinan kedua halaman dari server (untuk pindah instan)

    function pendingActive() {
        if (pending && Date.now() - pending.at > STALE_MS)
            pending = null;                       // balasan tidak datang (gagal / koneksi putus) -> boleh coba lagi
        return !!pending;
    }
    function paint(scene) {
        var buttons = scene && scene.__nhDeployBtns;
        if (!buttons)
            return;
        for (var i = 0; i < buttons.length; i++) {
            var on = i === activePage;
            if (buttons[i].off)
                buttons[i].off.setVisible(!on);           // gambar "off" menutupi gambar "on"
            else {                                         // cadangan (tanpa gambar): redupkan warna
                buttons[i].node.setColor(on ? cc.c3b(255, 255, 255) : cc.c3b(150, 150, 150));
                buttons[i].label.setColor(on ? cc.c3b(55, 35, 0) : cc.c3b(120, 100, 70));
            }
        }
    }
    function refreshBoard(scene) {
        if (!scene || scene.__nhSupportDisposed || !scene.boxList)
            return;
        var board = RoleData.getInstance().getAids();
        for (var i = 0; i < scene.boxList.length; i++)
            scene.boxList[i].updata(board[i], i);
        scene.pageView.setList();
        scene.check_Show();
        scene.isUpdate = false;                   // papan = persis data server (halaman baru), tidak perlu kirim ulang saat ditutup
    }
    // Gambar tombol: image/ibg/nh_page{1,2}_{on,off}.png (280x100, teks "Page N" sudah ada di gambar)
    function makeButton(index, w, h) {
        var on = cc.Sprite.create('image/ibg/nh_page' + (index + 1) + '_on.png');
        var off = on && cc.Sprite.create('image/ibg/nh_page' + (index + 1) + '_off.png');
        if (on && off) {
            var size = on.getContentSize();
            on.setScaleX(w / size.width);
            on.setScaleY(h / size.height);
            off.setAnchorPoint(cc.p(0.5, 0.5));
            off.setPosition(cc.p(size.width / 2, size.height / 2));
            on.addChild(off, 1);
            return { node: on, off: off, size: size };
        }
        if (!cc.LayerColor || !cc.LayerColor.create)
            return null;
        var node = cc.LayerColor.create(cc.c4b(214, 168, 70, 255), w, h);     // cadangan kalau file gambar tidak ada
        node.ignoreAnchorPointForPosition(false);
        node.setAnchorPoint(cc.p(0.5, 0.5));
        var cs = node.getContentSize();
        var label = cc.LabelTTF.create('Page ' + (index + 1), 'Helvetica', 22);
        label.setPosition(cc.p(cs.width / 2, cs.height / 2));
        node.addChild(label, 1);
        return { node: node, label: label, size: cs };
    }
    function build(scene) {
        scene.__nhDeployBtns = null;
        var ctl = scene.scene && scene.scene.controller, close = ctl && ctl.closeBtn, help = ctl && ctl.helpBtn;
        if (!close || !help || !close.getParent() || !help.getParent() || typeof cc === 'undefined')
            return;
        var wc = close.getParent().convertToWorldSpace(close.getPosition()), wh = help.getParent().convertToWorldSpace(help.getPosition());
        var unit = Math.abs(wc.x - wh.x) / REF.closeHelpDx;          // satuan dunia per px screenshot
        if (!(unit > 0) || !isFinite(unit))
            return;
        var out = [];
        for (var i = 0; i < PAGES; i++) {
            var world = cc.p(wc.x + (REF.xs[i] - REF.closeX) * unit, wc.y - (REF.y - REF.closeY) * unit);
            var p0 = scene.convertToNodeSpace(world), p1 = scene.convertToNodeSpace(cc.p(world.x + unit, world.y));
            var local = Math.abs(p1.x - p0.x) || 1;                   // satuan lokal scene per px screenshot
            var button = makeButton(i, REF.w * local, REF.h * local);
            if (!button)
                return;
            button.node.setPosition(p0);
            scene.addChild(button.node, 50);
            out.push(button);
        }
        scene.__nhDeployBtns = out;
        paint(scene);
    }
    function hit(scene, touch) {
        var buttons = scene.__nhDeployBtns;
        if (!buttons || !touch || !touch.getLocation)
            return -1;
        var at = touch.getLocation();
        for (var i = 0; i < buttons.length; i++) {
            var node = buttons[i].node, local = node.convertToNodeSpace(at), size = buttons[i].size;
            if (local.x >= 0 && local.y >= 0 && local.x <= size.width && local.y <= size.height)
                return i;
        }
        return -1;
    }
    // Papan halaman tujuan dihitung lokal: slot 6-8 = tim tempur, hero ganda / yang ada di tim tempur dibuang.
    // (Hero yang sudah dijual dikoreksi server lewat balasan.)
    function localBoard(source, mars) {
        var out = [], seen = {}, inMars = {}, i;
        for (i = 0; i < 15; i++)
            out.push(null);
        for (i = 0; i < 3; i++)
            if (mars && mars[i] != null)
                inMars[String(mars[i])] = true;
        for (i = 0; i < 15; i++) {
            if (i >= 6 && i < 9) {
                out[i] = mars && mars[i - 6] != null ? mars[i - 6] : null;
                continue;
            }
            var k = source && source[i];
            if (k == null || k === '' || inMars[String(k)] || seen[String(k)])
                continue;
            seen[String(k)] = true;
            out[i] = Number(k);
        }
        return out;
    }
    function request(scene, page) {
        if (!scene.__nhSupportReady || scene.__nhSupportDisposed || page === activePage || pendingActive())
            return;
        var roles = RoleData.getInstance(), shown = roles.getAids().slice(0, 15);
        pending = { page: page, scene: scene, at: Date.now(), prevPage: activePage, prevBoard: shown.slice(), prevPages: pages, optimistic: false };
        if (pages && pages.length >= PAGES) {
            // pindah instan: tampilkan dulu, server menyusul di belakang (koreksi / batalkan kalau ternyata ditolak)
            var next = pages.slice(0);
            next[activePage] = shown.slice();
            var board = localBoard(next[page], roles.mars);
            next[page] = board;
            pages = next;
            roles.aids = board.slice();
            activePage = page;
            pending.optimistic = true;
            pending.board = board.slice();
            paint(scene);
            refreshBoard(scene);
        }
        // papan yang sedang tampil ikut dikirim: perubahan yang belum disimpan tidak hilang
        GameConnection.send('aidsPage', { page: page, aids: shown });
    }
    function rollback(job) {
        var roles = RoleData.getInstance();
        activePage = job.prevPage;
        pages = job.prevPages;
        roles.aids = job.prevBoard.slice();
        paint(current);
        refreshBoard(job.scene);
    }

    var dispatch = GameConnection.handleGameCommand;
    GameConnection.handleGameCommand = function (key, value) {
        var result = dispatch.apply(this, arguments);
        try {
            if (key === 'heros' && value && typeof value.aidsPage === 'number') {
                if (Array.isArray(value.aidsPages))
                    pages = value.aidsPages.map(function (board) { return Array.isArray(board) ? board.slice(0, 15) : []; });
                activePage = value.aidsPage >= 1 && PAGES > 1 ? 1 : 0;
                var done = pending && pending.page === activePage ? pending : null;
                if (done)
                    pending = null;
                if (done && done.optimistic) {
                    // sudah tampil duluan; gambar ulang hanya kalau server memberi papan yang berbeda (mis. hero dijual)
                    if (JSON.stringify(RoleData.getInstance().getAids().slice(0, 15)) !== JSON.stringify(done.board))
                        refreshBoard(done.scene);
                }
                else if (done)
                    refreshBoard(done.scene);
                paint(current);
            }
            else if (key === 'operResult' && pending && value && Number(value.type) === 0 && Number(value.res) !== 0) {
                var failed = pending;                   // server menolak (papan tidak valid / error) -> halaman TIDAK pindah
                pending = null;
                if (failed.optimistic)
                    rollback(failed);
            }
        }
        catch (e) {
            if (typeof log === 'function')
                log('NH_DEPLOY_PAGES_REFRESH_FAILED ' + e);
        }
        return result;
    };
    var initUI = proto.initUI, removeMe = proto.onRemoveMe, touchEnded = proto.onTouchesEnded;
    proto.initUI = function () {
        var result = initUI.apply(this, arguments);
        current = this;
        pending = null;
        try {
            build(this);                          // gagal membuat tombol -> papan tetap jalan normal tanpa tombol
        }
        catch (e) {
            this.__nhDeployBtns = null;
            if (typeof log === 'function')
                log('NH_DEPLOY_PAGES_BUILD_FAILED ' + e);
        }
        return result;
    };
    proto.onTouchesEnded = function (touches) {
        if (this.__nhDeployBtns && !this.__nhSupportDisposed) {
            var index = hit(this, touches && touches[0]);
            if (index >= 0) {
                request(this, index);
                return;
            }
        }
        return touchEnded.apply(this, arguments);
    };
    proto.onRemoveMe = function () {
        if (current === this)
            current = null;
        if (pending && pending.scene === this)
            pending = null;
        this.__nhDeployBtns = null;
        return removeMe.apply(this, arguments);
    };
    proto.__nhDeployPages = true;
}

__NH_INSTALL_COMBAT_FIXES();
__NH_INSTALL_SUPPORT_FIXES();
__NH_INSTALL_DEPLOY_PAGES();
__NH_INSTALL_RING_CLIENT_FIXES();
__NH_INSTALL_CLAN_WAR_FIXES();
__NH_INSTALL_INVENTORY_BATCH_FIXES();
__NH_INSTALL_NINJA_WAR_FIXES();
__NH_INSTALL_ARENA_CLIENT_FIXES();
__NH_INSTALL_ECONOMY_CLIENT_FIXES();
__NH_INSTALL_SOCIAL_CLIENT_FIXES();
__NH_INSTALL_CAPTURE_CLIENT_FIXES();
__NH_INSTALL_HALL_CLIENT_FIXES();
__NH_INSTALL_RECRUITMENT_NOTICES();
__NH_INSTALL_TRIAL_REWARD_DISPLAY();
__NH_INSTALL_APP_LIFECYCLE();
__NH_INSTALL_RAFFLE_PERFORMANCE();

// ── NH: matikan semua tutorial paksa (tiroScene) ─────────────────────────────
// Klien memanggil PromptLayer.setPageView('tiroScene', <nomor guide>) untuk tiap langkah
// tutorial (10, 12, 17, 21, 31, 41, 54, ...). Di sini semuanya diabaikan.
// Matikan dengan NH_SKIP_TUTORIAL = false.
(function installSkipTutorial() {
    var NH_SKIP_TUTORIAL = true;
    if (!NH_SKIP_TUTORIAL) return;
    try {
        if (typeof isTiro !== 'undefined') isTiro = false;
    } catch (e) {}

    if (typeof PromptLayer !== 'undefined' && PromptLayer.setPageView && !PromptLayer.__nhSkipTutorial) {
        var original = PromptLayer.setPageView;
        PromptLayer.setPageView = function (page, data) {
            if (page === 'tiroScene') {
                if (typeof log === 'function') log('NH_TUTORIAL_SKIPPED tiroScene ' + data);
                return;
            }
            return original.apply(this, arguments);
        };
        PromptLayer.__nhSkipTutorial = true;
    }

    if (typeof ContentView !== 'undefined' && ContentView.setPageView && !ContentView.__nhSkipTutorial) {
        var origContent = ContentView.setPageView;
        ContentView.setPageView = function (page, data) {
            if (page === 'dialogue' && data && (data.id === 200006 || data.id === 200013 || String(data.done).indexOf('Tiro') >= 0)) {
                if (typeof log === 'function') log('NH_TUTORIAL_SKIPPED dialogue ' + data.id);
                return;
            }
            return origContent.apply(this, arguments);
        };
        ContentView.__nhSkipTutorial = true;
    }

    if (typeof HomeScene !== 'undefined' && HomeScene.prototype && !HomeScene.prototype.__nhClearOverlays) {
        var origHomeInit = HomeScene.prototype.initUI;
        HomeScene.prototype.initUI = function () {
            var res = origHomeInit.apply(this, arguments);
            try {
                if (typeof isTiro !== 'undefined') isTiro = false;
                if (typeof ContentView !== 'undefined' && ContentView.setPageView) ContentView.setPageView(undefined);
                if (typeof PromptLayer !== 'undefined' && PromptLayer.setPageView) PromptLayer.setPageView(undefined);
            } catch (e) {}
            return res;
        };
        HomeScene.prototype.__nhClearOverlays = true;
    }
}());

// ── NH: Soul Fusion massal (pilih banyak ninja identik sekaligus) ─────────────
(function installBatchSoulFusion() {
    if (typeof ShiYanShiScene === 'undefined' || !ShiYanShiScene.prototype || ShiYanShiScene.prototype.__nhBatchFusion)
        return;
    var proto = ShiYanShiScene.prototype, FUSION = 1, batch = null;
    function tab() { return Number(ExchangeData.getInstance().setIdx); }
    function evt() { return ShiYanShiEvent.getInstance(); }
    function room(tarKey) {
        try {
            var caps = Const.getInstance().MAX_QUALITY_LV, rd = RoleData.getInstance();
            var q = Number(Config.getInstance().roleObject[rd.getRoleID(tarKey)].quality);
            var cap = parseInt(caps[(q >= caps.length ? caps.length : q) - 1], 10);
            return cap - Number(rd.getQlv(tarKey));
        } catch (e) { return 10; }
    }

    // 1) slot "Source" di tab Soul Fusion -> dialog multi-pilih, daftar = ninja identik
    var showSelect = proto.showSelectRole;
    proto.showSelectRole = function (show) {
        if (tab() !== FUSION || Number(this.selectRole_idx) !== 0 || !this.sysRoleListScene)
            return showSelect.apply(this, arguments);
        if (!show) {
            var r = showSelect.apply(this, arguments);
            this.sysRoleListScene.setEnabledAll(false);
            return r;
        }
        var data = ExchangeData.getInstance(), real = data.setIdx, result;
        data.setIdx = 0;                                   // pakai jalur dialog multi milik Combine
        try { result = showSelect.call(this, show); } finally { data.setIdx = real; }
        this.sysRoleListScene.setList(RoleData.getInstance().sameRole(this.tarId));
        return result;
    };

    // 2) tampilkan slot donor di tab Soul Fusion & kosongkan pilihan saat masuk tab
    var showBtn = proto.showButton;
    proto.showButton = function (idx) {
        var result = showBtn.apply(this, arguments);
        if (parseInt(idx, 10) === FUSION) {
            if (this.roleHeadContainer) this.roleHeadContainer.setVisible(true);
            evt().removeData();
        }
        return result;
    };

    // 3) ganti target -> pilihan donor lama tidak valid lagi
    var cellTouched = proto.tableCellTouched;
    proto.tableCellTouched = function () {
        var result = cellTouched.apply(this, arguments);
        if (tab() === FUSION && Number(this.selectRole_idx) !== 0) evt().removeData();
        return result;
    };

    // 4) teks tengah: ganti "Exp / Star Point" milik Combine dengan jumlah donor
    var changed = proto.onChangeShiYanShiEvent;
    proto.onChangeShiYanShiEvent = function () {
        var result = changed.apply(this, arguments);
        if (tab() === FUSION) {
            var n = (evt().list || []).length, text = Config.getInstance().textObject;
            this.txtTF.setString(text[3190]); this.numTF.setString('');
            this.txtTF1.setString(n ? 'Soul Fusion +' : ''); this.numTF1.setString(n ? String(n) : '');
        }
        return result;
    };

    // 5) kirim semua donor: srcId = donor pertama, srcList = seluruh pilihan (dipangkas sesuai sisa cap)
    var send = proto.send;
    proto.send = function () {
        if (tab() !== FUSION) return send.apply(this, arguments);
        var tar = String(this.tarId);
        var donors = (evt().list || []).filter(function (k) { return String(k) !== tar; });
        if (!donors.length) return send.apply(this, arguments);
        donors = donors.slice(0, Math.max(1, room(this.tarId)));
        this.srcId = donors[0];
        batch = donors.slice();
        try { return send.apply(this, arguments); } finally { batch = null; }
    };
    var transport = GameConnection.send;
    GameConnection.send = function (command, payload) {
        if (command === 'exchange' && batch && payload && Number(payload.type) === FUSION) {
            var copy = {};
            for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) copy[k] = payload[k];
            copy.srcList = batch.slice();
            payload = copy;
        }
        return transport.call(this, command, payload);
    };
    proto.__nhBatchFusion = true;
}());

// ── NH: efek "glow" ninja Soul Fusion (qlv >= 11) -> cegah force close di Exam / NewExam ───
// Log adb: SIGSEGV native di CCArmature::init (assert CCArmature.cpp:151/157, data armature tidak
// ditemukan lalu null-pointer). Itu crash NATIVE, bukan exception JS, jadi try/catch tidak bisa
// menolong: armature harus sudah terdaftar SEBELUM ccs.Armature.create dipanggil.
// addGlow() membuat armature "glow" (glow15/20/25/30 untuk qlv 11+; qlv <= 10 tidak memanggilnya).
// Di scene Exam/NewExam armature itu belum dimuat. Di sini kita muat dulu; kalau tetap tidak
// terdaftar, efek hiasan itu dilewati sama sekali.
(function installGlowGuard() {
    var GLOW_JSON = 'armatures/Export/glow/glow.ExportJson';
    function manager() {
        try { return ccs.ArmatureDataManager.getInstance(); } catch (e) { return null; }
    }
    function glowReady() {
        var mgr = manager();
        if (!mgr) return false;
        try {
            if (typeof mgr.getArmatureData === 'function' && mgr.getArmatureData('glow')) return true;
        } catch (e) { /* lanjut coba muat */ }
        try { mgr.addArmatureFileInfo(GLOW_JSON); } catch (e) { return false; }
        try {
            return typeof mgr.getArmatureData === 'function' ? !!mgr.getArmatureData('glow') : true;
        } catch (e) { return true; }
    }
    ['RoleStopBox', 'JingJiChangRoleBox', 'RoleHeadBox'].forEach(function (name) {
        var cls; try { cls = eval(name); } catch (e) { return; }
        if (!cls || !cls.prototype || typeof cls.prototype.addGlow !== 'function' || cls.prototype.__nhGlowGuard)
            return;
        var original = cls.prototype.addGlow;
        cls.prototype.addGlow = function () {
            if (!glowReady()) {
                if (this.armatureGlow && this.armatureGlow.setVisible) { try { this.armatureGlow.setVisible(false); } catch (e) {} }
                return;
            }
            try { return original.apply(this, arguments); }
            catch (e) { if (typeof console !== 'undefined' && console.log) console.log('[NH] addGlow dilewati: ' + (e && e.message)); }
        };
        cls.prototype.__nhGlowGuard = true;
    });
}());
// ════════════════════════════════════════════════════════════════════════════
// NH SMOOTH LOADING — mengurangi "diam sejenak" saat animasi loading / buka scene
//
// Penyebab: ArmatureLoad.addExportJson/addXML memanggil
// ccs.ArmatureDataManager.addArmatureFileInfo() SECARA SINKRON. Fungsi itu membaca
// ExportJson + plist dan men-decode PNG (sampai beberapa MB) di thread utama,
// jadi animasi/spinner berhenti beberapa ratus ms sampai selesai.
//
// Solusi (aman, semua dibungkus try/catch, bisa dimatikan lewat NH_SMOOTH_OFF):
//  1. Ukur tiap addArmatureFileInfo. Yang lambat (>= SLOW_MS) dicatat ke "hot list"
//     (disimpan di localStorage, log tag NH_HITCH di logcat).
//  2. Pada sesi berikutnya, hot list dimuat lebih dulu saat layar Home idle
//     (satu aset per tick, tidak pernah saat popup/loading tampil).
//  3. Aset hot tidak di-unload oleh removeArmatureFileInfo, sehingga saat Forge /
//     Advanced Train dibuka datanya sudah ada di cache dan tidak ada hentakan.
// ════════════════════════════════════════════════════════════════════════════
(function __NH_SMOOTH_LOADING() {
    'use strict';
    if (typeof NH_SMOOTH_OFF !== 'undefined' && NH_SMOOTH_OFF) return;
    if (typeof ccs === 'undefined' || !ccs.ArmatureDataManager) return;

    var SLOW_MS = 40, MAX_HOT = 12, MAX_MS = 3000, TICK_MS = 700, KEY = 'nh_hot_armatures_v1';
    var order = [], pinned = {};

    function say(msg) { try { if (typeof log === 'function') log('NH_HITCH ' + msg); } catch (e) {} }
    function store() { try { return sys.localStorage; } catch (e) { return null; } }
    function base(u) { return String(u).replace(/^.*\//, '').replace(/\.ExportJson$/i, ''); }

    (function loadList() {
        try {
            var s = store(), raw = s && s.getItem(KEY);
            var parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) order = parsed.filter(function (u) { return typeof u === 'string'; }).slice(0, MAX_HOT);
        } catch (e) { order = []; }
        order.forEach(function (u) { pinned[base(u)] = true; });
    }());

    function saveList() {
        try { var s = store(); if (s) s.setItem(KEY, JSON.stringify(order)); } catch (e) {}
    }

    function note(url, ms) {
        if (ms > MAX_MS || !/\.ExportJson$/i.test(url) || order.indexOf(url) >= 0 || order.length >= MAX_HOT) return;
        order.push(url);
        pinned[base(url)] = true;
        saveList();
        say('catat aset lambat ' + url + ' ' + ms + 'ms (akan di-prewarm di sesi berikutnya)');
    }

    function wrapManager(mgr) {
        if (!mgr || mgr.__nhSmooth) return mgr;
        try {
            var add = mgr.addArmatureFileInfo, remove = mgr.removeArmatureFileInfo;
            if (typeof add === 'function') {
                mgr.addArmatureFileInfo = function () {
                    try {
                        var a0 = arguments[0];
                        if (typeof a0 === 'string' && a0.indexOf('.xml') !== -1) {
                            var fu = cc.FileUtils.getInstance();
                            if (typeof fu.fullPathForFilename === 'function') {
                                var fp = String(fu.fullPathForFilename(a0));
                                if (fp.charAt(0) === '/' && !fu.isFileExist(fp)) {
                                    say('SKIPPING MISSING ARMATURE XML: ' + a0);
                                    return;
                                }
                            }
                        }
                    } catch (eArmXML) {}
                    var t = Date.now(), result = add.apply(this, arguments), dt = Date.now() - t;
                    if (dt >= SLOW_MS) {
                        say('addArmatureFileInfo ' + (arguments.length === 1 ? arguments[0] : '[' + arguments.length + ' arg]') + ' ' + dt + 'ms');
                        if (arguments.length === 1 && typeof arguments[0] === 'string') note(arguments[0], dt);
                    }
                    return result;
                };
            }
            if (typeof remove === 'function') {
                mgr.removeArmatureFileInfo = function (u) {
                    if (typeof u === 'string' && pinned[base(u)]) return; // tahan di cache
                    return remove.apply(this, arguments);
                };
            }
            mgr.__nhSmooth = true;
        } catch (e) { say('wrap gagal: ' + (e && e.message)); }
        return mgr;
    }

    // Pasang di getInstance (supaya objek proxy mana pun ikut terbungkus), untuk cc.* dan ccs.*
    [ccs, typeof cc !== 'undefined' ? cc : null].forEach(function (ns) {
        try {
            var cls = ns && ns.ArmatureDataManager;
            if (!cls || cls.__nhSmoothGI || typeof cls.getInstance !== 'function') return;
            var gi = cls.getInstance;
            cls.getInstance = function () { return wrapManager(gi.apply(this, arguments)); };
            cls.__nhSmoothGI = true;
        } catch (e) {}
    });

    // Prewarm: hanya saat Home idle, satu aset per tick.
    var cursor = 0, started = false;
    function homeIdle() {
        try {
            return typeof MainView !== 'undefined' && String(MainView.page) === '4' &&
                (typeof PromptView === 'undefined' || !PromptView.page);
        } catch (e) { return false; }
    }
    function tick() {
        var wait = TICK_MS;
        try {
            if (cursor >= order.length) return; // selesai
            if (homeIdle()) {
                var url = order[cursor++], t = Date.now();
                try { ccs.ArmatureDataManager.getInstance().addArmatureFileInfo(url); } catch (e) { say('prewarm gagal ' + url); }
                var dt = Date.now() - t;
                say('prewarm ' + url + ' ' + dt + 'ms');
                if (dt > 250) wait = TICK_MS * 3; // beri napas bila berat
            }
        } catch (e) {}
        setTimeout(tick, wait);
    }
    function start() {
        if (started || !order.length) return;
        started = true;
        setTimeout(tick, 3000);
    }
    if (typeof setTimeout === 'function') start();
    say('aktif; hot list=' + order.length);
}());

// ════════════════════════════════════════════════════════════════════════════
// NH PIN ATLASES — tahan atlas UI besar di memori supaya tidak di-decode ulang
//
// Bukti dari logcat: tiap pindah scene, engine membuang texture yang tidak dipakai
// (removeUnusedTextures). Saat balik dari Advanced Train (scene sekolah) ke Home,
// ibgicon.png (2048x2048 = 16 MB) dan ibuilding.png (1024x1024 = 4 MB) harus
// di-decode & di-upload ulang di thread utama (~20 MB) → animasi berhenti sejenak.
// retain() menaikkan refcount sehingga texture tidak ikut dibuang.
// Tambahan memori ±20 MB (total texture ±100–115 MB).
// ════════════════════════════════════════════════════════════════════════════
(function __NH_PIN_ATLASES() {
    'use strict';
    if (typeof NH_SMOOTH_OFF !== 'undefined' && NH_SMOOTH_OFF) return;
    if (typeof cc === 'undefined' || !cc.TextureCache || typeof setTimeout !== 'function') return;

    var ATLASES = [
        'image/resources-large/ibgicon.png',
        'image/resources-large/ibuilding.png'
    ];
    var PREFIXES = ['assets/UI/', 'assets/', 'UI/', ''];
    var done = {}, remaining = ATLASES.length, warned = false;

    function say(msg) { try { if (typeof log === 'function') log('NH_PIN ' + msg); } catch (e) {} }

    function find(cache, rel) {
        for (var i = 0; i < PREFIXES.length; i++) {
            try {
                var tex = cache.textureForKey(PREFIXES[i] + rel);
                if (tex) return tex;
            } catch (e) {}
        }
        return null;
    }

    function tick() {
        try {
            var cache = cc.TextureCache.getInstance();
            ATLASES.forEach(function (rel) {
                if (done[rel]) return;
                var tex = find(cache, rel);
                if (!tex) return;
                if (typeof tex.retain !== 'function') {
                    if (!warned) { warned = true; say('retain() tidak tersedia di engine ini — pin dilewati'); }
                    done[rel] = true; remaining--; return;
                }
                tex.retain();
                done[rel] = true; remaining--;
                say('ditahan di memori: ' + rel);
            });
        } catch (e) { say('tick gagal: ' + (e && e.message)); }
        if (remaining > 0) setTimeout(tick, 3000);
    }
    setTimeout(tick, 2000);
    say('aktif; menunggu ' + ATLASES.join(', '));
}());

// ── NH: tombol "Next" di layar Victory (lanjut ke stage berikutnya tanpa balik ke peta) ──
(function installNextStageButton() {
    if (typeof WinScene === 'undefined' || typeof GameLayerScene === 'undefined' ||
        !WinScene.prototype || WinScene.prototype.__nhNextStage) return;
    var winProto = WinScene.prototype, battleProto = GameLayerScene.prototype;
    var BTN_IMAGE = 'image/ibg/nh_next.png', BTN_TAG = 'nhNext', BTN_GAP = 140;
    var pendingNext = null;

    function toast(text) { try { PromptBox.getInstance().updataTxt(text); } catch (e) { } }
    function num(v) { return parseInt(v, 10); }
    function isMain(row) { return !!row && num(row.mainThread) === 1; }
    function rowsOf(type, chapter) {
        var all = Config.getInstance().adventureObject;
        return (all && all[type] && all[type][chapter]) || null;
    }

    // Stage utama berikutnya. Stage cabang (mainThread 2/3) tidak punya Next.
    // Setelah stage utama terakhir sebuah chapter -> stage utama pertama chapter berikutnya.
    function findNext(type, chapter, stage) {
        var rows = rowsOf(type, chapter), i, r, cur = null;
        if (!rows) return null;
        for (i = 0; i < rows.length; i++) if (rows[i] && num(rows[i].stage) === stage) { cur = rows[i]; break; }
        if (!isMain(cur)) return null;
        for (i = 0; i < rows.length; i++) {
            r = rows[i];
            if (isMain(r) && num(r.preStage) === stage) return { type: type, chapter: chapter, stage: num(r.stage), row: r };
        }
        var next = rowsOf(type, chapter + 1);
        if (!next) return null;
        for (i = 0; i < next.length; i++) {
            r = next[i];
            if (isMain(r) && !(num(r.preStage) > 0)) return { type: type, chapter: chapter + 1, stage: num(r.stage), row: r };
        }
        return null;
    }

    // Chapter berikutnya baru ada di peta kalau server sudah membukanya (panjang adv/eadv).
    function isUnlocked(job) {
        var ad = AdventureData.getInstance();
        var opened = job.type === 1 ? ad.getChapter() : ad.getEliteChapter();
        return num(opened) >= job.chapter;
    }

    function startStage(job) {
        var ad = AdventureData.getInstance(), gd = GameData.getInstance();
        ad.currentAdventType = job.type;
        ad.currentChpater = job.chapter;
        ad.currentStage = job.stage;
        gd.sockentType = 'PVE';
        gd.sockentData = { type: job.type, chapter: job.chapter, stage: job.stage, sweep: 0 };
        MainView.setPageView('gameLoad');           // sama persis dengan AdventureStage.onStartGame
    }

    function goNext(scene) {
        var job = scene.nhNextJob, ud = UserData.getInstance();
        if (!job) return;
        var left = job.type === 1 ? ud.getFubenLeftTime(job.chapter, job.stage)
                                  : ud.getEliteFubenLeftTime(job.chapter, job.stage);
        if (left !== undefined && left !== null && Number(left) <= 0) {
            toast('Daily limit for stage ' + job.chapter + '-' + job.stage + ' is used up.');
            return;
        }
        if (!ud.moneyEnough(Number(job.row.energy) || 0, 'energy')) return;   // munculkan dialog isi energi
        if (!isUnlocked(job)) { toast('The next chapter is not open yet.'); return; }
        pendingNext = job;
        try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) { }
        ContentView.setPageView(null);
        ChatData.getInstance().showBagFullText();
        var battle = scene.target;
        try {                                       // sama dengan overDialogue, tapi tanpa dialog akhir cerita
            battle.ui_visble(false);
            (battle.roleShowList || []).forEach(function (r) { battle.rootNode.removeChild(r, 1); });
        } catch (e) { }
        battle.overDialogueComplete();
    }

    // Tombol Next di sebelah kiri tombol Acquire (hanya untuk battle PVE & stage utama)
    var initUI = winProto.initUI;
    winProto.initUI = function () {
        var result = initUI.apply(this, arguments);
        try {
            var gd = GameData.getInstance(), d = gd.sockentData;
            if (gd.sockentType !== 'PVE' || !d || !this.fanhui) return result;
            var job = findNext(num(d.type), num(d.chapter), num(d.stage));
            if (!job || !isUnlocked(job)) return result;
            var sprite = cc.Sprite.create(BTN_IMAGE);
            if (!sprite) return result;
            var ref = this.fanhui, pos = ref.getPosition();
            sprite.setAnchorPoint(ref.getAnchorPoint());
            sprite.setScale(ref.getScale());
            sprite.setPosition(cc.p(pos.x - BTN_GAP, pos.y));
            ref.getParent().addChild(sprite, ref.getLocalZOrder ? ref.getLocalZOrder() : 0);
            sprite._ty = BTN_TAG;
            this.nhNextJob = job;
            this.nhNextBtn = sprite;
            this.toucheList.push(sprite);
        } catch (e) { }
        return result;
    };

    var touchEnded = winProto.onTouchesEnded;
    winProto.onTouchesEnded = function (touches) {
        var pressed = this.lastTouchTarget;
        if (pressed && pressed._ty === BTN_TAG && pressed.isVisible()) {
            var hit = GameTools.getInstance().onTouchesHit(touches[0], this.toucheList);
            touchEnded.apply(this, arguments);      // rapikan warna & state tombol bawaan
            if (hit === pressed) goNext(this);
            return;
        }
        return touchEnded.apply(this, arguments);
    };

    // Setelah kembali ke peta (setBack), langsung mulai stage berikutnya
    var overComplete = battleProto.overDialogueComplete;
    battleProto.overDialogueComplete = function () {
        var job = pendingNext;
        pendingNext = null;
        var result = overComplete.apply(this, arguments);
        if (job) {
            var run = function () { try { startStage(job); } catch (e) { } };
            try { setTimeout(run, 0); } catch (e) { run(); }
        }
        return result;
    };

    winProto.__nhNextStage = true;
}());

// ── Regenerasi stamina otomatis: label hitung mundur di HUD (kotak di kanan stamina) ──────────
(function () {
    var info = null, recvAt = 0;       // info = {sec, interval, amount, cap} dari server
    function remaining() {
        if (!info || info.sec == null) return null;
        var left = info.sec - Math.floor((Date.now() - recvAt) / 1000);
        return left < 0 ? 0 : left;
    }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function render(hud) {
        if (!hud || !hud.__nhEnergyTF) return;
        var left = remaining(), text = '', prog = 1;
        if (info && left != null) {
            text = '+' + info.amount + '  ' + pad(Math.floor(left / 60)) + ':' + pad(left % 60);
            prog = Math.max(0, Math.min(1, 1 - left / (info.interval || 1800)));
        }
        else if (info) text = 'FULL';
        hud.__nhEnergyTF.setString(text);
        if (hud.__nhEnergyFill) hud.__nhEnergyFill.setScaleX(Math.max(0.001, prog) * hud.__nhEnergyFillK0);
        if (hud.__nhEnergyPill) hud.__nhEnergyPill.setVisible(!!info);
    }
    function attach(hud) {
        try {
            if (hud.__nhEnergyTF || !hud.energyMC) return;
            var ref = hud.energyMC, size = ref.getSize ? ref.getSize() : { width: 170, height: 40 };
            var w = size.width * 1.2, h = size.width * 0.33;          // sebesar bar stamina asli
            var pill = cc.Node.create();
            pill.setPosition(cc.p(ref.getPositionX() + size.width + size.width * 0.3, ref.getPositionY()));
            // Bar krem yang sama dengan bar gold/silver/stamina (moneyBg), dilebarkan lewat Scale9
            var bar = cc.Scale9Sprite.createWithSpriteFrameName('image/iicon/moneyBg.png');
            bar.setContentSize(cc.size(w, h));
            bar.setAnchorPoint(cc.p(0, 0.5)); bar.setPosition(cc.p(0, 0));
            pill.addChild(bar, 0);
            // garis progres hijau di dasar bar
            var fill = cc.Sprite.create('image/ibg/nh_energy_regen_fill.png');
            var trackX = h * 0.85, trackW = w - trackX - h * 0.35;
            fill.setAnchorPoint(cc.p(0, 0.5));
            fill.setPosition(cc.p(trackX, -h * 0.30));
            hud.__nhEnergyFillK0 = trackW / 144;
            fill.setScaleY(h * 0.16 / 6);
            pill.addChild(fill, 1);
            // ikon jam bulat di kiri (menimpa tepi bar seperti ikon bawaan)
            var ic = cc.Sprite.create('image/ibg/nh_energy_regen_icon.png');
            ic.setScale((h * 1.3) / 56);
            ic.setPosition(cc.p(h * 0.36, 0));
            pill.addChild(ic, 2);
            // teks gelap seperti angka "5/100"
            var tf = cc.LabelTTF.create('', pFont0, Math.round(h * 0.66));
            tf.setAnchorPoint(cc.p(0.5, 0.5));
            tf.setColor(cc.c3b(72, 56, 40));
            tf.setPosition(cc.p(trackX + trackW / 2, h * 0.08));
            pill.addChild(tf, 2);
            hud.addChild(pill, 10);
            hud.__nhEnergyTF = tf;
            hud.__nhEnergyFill = fill;
            hud.__nhEnergyPill = pill;
            hud.schedule(function () { render(hud); }, 1);
            render(hud);
        } catch (e) { }
    }
    var rcv = GameConnection.onmessage;
    GameConnection.onmessage = function (message) {
        if (message && message.energyRegen) {
            info = message.energyRegen; recvAt = Date.now();
            var rest = {}, n = 0;
            for (var k in message) if (Object.prototype.hasOwnProperty.call(message, k) && k !== 'energyRegen') { rest[k] = message[k]; n++; }
            if (n === 0) return;
            message = rest;
        }
        return rcv.call(this, message);
    };
    if (typeof UserInfor !== 'undefined' && UserInfor.prototype) {
        var ud = UserInfor.prototype.userDataChange;
        UserInfor.prototype.userDataChange = function () {
            var r = ud.apply(this, arguments);
            attach(this);
            return r;
        };
    }
}());

// ── NH: bangunan aktif/nonaktif — diatur dari SERVER ─────────────────────────
// Daftar true/false ada di backend (buildingConfig.js) dan dikirim saat login lewat key
// `homeBuildingVisible` (+ `buildingDisabledText`). Tidak ada flag di sisi klien: ubah di server,
// login ulang, selesai — APK tidak perlu dibongkar. Bila server tidak mengirim apa pun,
// semua bangunan aktif.
//   1) Layar rumah  : bangunan nonaktif disembunyikan, sisanya maju (posisi x = 180 + index * spacing_W).
//   2) Semua pintu masuk (ikon rumah, tombol "How to improve Combat power", dll) lewat
//      MainView.setPageView("<id bangunan>") : bila nonaktif, tidak masuk, hanya muncul pesan.
(function installServerBuildingToggle() {
    var flags = null;
    var disabledText = 'Fiture Ini Dinonaktifkan';
    if (typeof GameConnection !== 'undefined' && typeof GameConnection.handleGameCommand === 'function' &&
        !GameConnection.__nhBuildingToggle) {
        var reduce = GameConnection.handleGameCommand;
        GameConnection.handleGameCommand = function (key, value) {
            if (key === 'homeBuildingVisible') {
                if (value && typeof value === 'object')
                    flags = value;
                return;
            }
            if (key === 'buildingDisabledText') {
                if (typeof value === 'string' && value)
                    disabledText = value;
                return;
            }
            return reduce.apply(this, arguments);
        };
        GameConnection.__nhBuildingToggle = true;
    }
    function disabled(id) {
        return !!flags && /^\d+$/.test(String(id)) && flags[String(id)] === false;
    }
    // 1) layar rumah
    if (typeof HomeScene !== 'undefined' && HomeScene.prototype && !HomeScene.prototype.__nhBuildingToggle) {
        var createBg = HomeScene.prototype.createBg;
        HomeScene.prototype.createBg = function () {
            try {
                var cfg = Config.getInstance();
                // simpan daftar lengkap sekali, lalu saring ulang dari situ tiap scene dibuat
                if (!cfg.__nhAllBuildings)
                    cfg.__nhAllBuildings = cfg.buildingList.slice();
                cfg.buildingList = cfg.__nhAllBuildings.filter(function (id) { return !disabled(id); });
            } catch (e) { }
            return createBg.apply(this, arguments);
        };
        HomeScene.prototype.__nhBuildingToggle = true;
    }
    // 2) pintu masuk bangunan
    if (typeof MainView !== 'undefined' && typeof MainView.setPageView === 'function' && !MainView.__nhBuildingToggle) {
        var setPageView = MainView.setPageView;
        MainView.setPageView = function (page) {
            if (disabled(page)) {
                try { PromptBox.getInstance().updataTxt(disabledText); } catch (e) { }
                return;
            }
            return setPageView.apply(this, arguments);
        };
        MainView.__nhBuildingToggle = true;
    }
}());

// ── NH: Laboratorium (Combine / Soul Fusion / Skill) — cek "ninja ada di formasi Battleground" ──────────
// Klien menolak donor dengan "Please don't use the existing ninja in the Battleground formation" (Text 7118)
// berdasarkan RoleData.rings milik klien (perbandingan `==` longgar). Padahal formasi yang sah ada di server:
// handler `exchange` (commands.js → laboratory → donorOk) sudah menolak hero yang ada di heros.mars / heros.rings
// dan restoreLaboratory() di atas mengembalikan UI bila ditolak. Jadi cek lokal ini dilewati supaya server yang
// memutuskan. Cek lain (war, clan, practice, equipment, mars) TIDAK diubah.
// Matikan dengan NH_LAB_SERVER_RING_CHECK = false.
(function installLabServerRingCheck() {
    var NH_LAB_SERVER_RING_CHECK = true;
    if (!NH_LAB_SERVER_RING_CHECK || typeof ShiYanShiEvent === 'undefined' || !ShiYanShiEvent.prototype ||
        typeof ShiYanShiEvent.prototype.checkHeroIsInRing !== 'function' || ShiYanShiEvent.prototype.__nhServerRingCheck)
        return;
    ShiYanShiEvent.prototype.checkHeroIsInRing = function () { return false; };
    ShiYanShiEvent.prototype.__nhServerRingCheck = true;
}());
// ── NH: Asset & Crash Guard (Discord Button + Missing Sprite & Scene Protection) ────
(function installDiscordAndCrashGuard() {
    var DISCORD_URL = 'https://discord.gg/QFecyCTEw3';
    var BG_FALLBACK = 'image/ibg/bg_loginscene_lyto_n.png';
    var MISSING_BG_MAP = {
        'image/ibg/bg_loginscene_lyto.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_lyto_sd.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_nw.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_lyto_ky.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_beastsaga.png': 'image/ibg/bg_loginscene_beastwar.png',
        'image/ibg/bg_loginscene.png': BG_FALLBACK,
        'image/ibg/bg_login_new.png': BG_FALLBACK,
        'image/ibg/bg_login_lyto.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_ios.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_aon.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_ns.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_52.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_53.png': BG_FALLBACK,
        'image/ibg/bg_loginscene_ys.png': BG_FALLBACK,
        'image/ibg/bt_login_fastEntrance.png': 'image/ibg/bt_login_fastEntrance_lyto.png',
        'image/ibg/bt_login_register.png': 'image/ibg/btn_signup.png',
        'image/ibg/facebook-like.png': 'image/ibg/nh_discord.png'
    };

    // 1. Guard cc.Node against null/undefined children
    if (typeof cc !== 'undefined' && cc.Node && cc.Node.prototype && !cc.Node.prototype.__nhSafeNode) {
        var origAddChild = cc.Node.prototype.addChild;
        cc.Node.prototype.addChild = function (child) {
            if (!child) {
                if (typeof cc !== 'undefined' && typeof cc.log === 'function') cc.log('[NH Guard] Blocked addChild(null/undefined)');
                return;
            }
            return origAddChild.apply(this, arguments);
        };

        var origReorderChild = cc.Node.prototype.reorderChild;
        cc.Node.prototype.reorderChild = function (child) {
            if (!child) {
                if (typeof cc !== 'undefined' && typeof cc.log === 'function') cc.log('[NH Guard] Blocked reorderChild(null/undefined)');
                return;
            }
            return origReorderChild.apply(this, arguments);
        };

        var origRemoveChild = cc.Node.prototype.removeChild;
        cc.Node.prototype.removeChild = function (child) {
            if (!child) return;
            return origRemoveChild.apply(this, arguments);
        };

        cc.Node.prototype.__nhSafeNode = true;
    }

    // 2. Guard cc.MenuItemSprite against null normal sprite
    if (typeof cc !== 'undefined' && cc.MenuItemSprite && typeof cc.MenuItemSprite.create === 'function' && !cc.MenuItemSprite.__nhGuard) {
        var misCreate = cc.MenuItemSprite.create;
        cc.MenuItemSprite.create = function (normal, selected, disabled, target, selector) {
            if (!normal) {
                try {
                    normal = cc.Sprite.create(BG_FALLBACK) || cc.Sprite.create();
                } catch (e) { }
            }
            return misCreate.apply(this, arguments);
        };
        cc.MenuItemSprite.__nhGuard = true;
    }

    // 3. Guard cc.Sprite.create
    if (typeof cc !== 'undefined' && cc.Sprite && typeof cc.Sprite.create === 'function' && !cc.Sprite.__nhGuard) {
        var spCreate = cc.Sprite.create;
        cc.Sprite.create = function (f) {
            var target = f;
            if (typeof f === 'string' && MISSING_BG_MAP[f]) {
                target = MISSING_BG_MAP[f];
            }
            var res = null;
            try {
                if (target !== undefined) res = spCreate.call(this, target);
                else res = spCreate.apply(this, arguments);
            } catch (e1) { }

            if (!res && typeof f === 'string') {
                try {
                    res = spCreate.call(this, BG_FALLBACK);
                } catch (e2) { }
            }
            if (!res) {
                try {
                    res = spCreate.call(this, 'image/ibg/bg_loginscene_ne.png');
                } catch (e3) { }
            }
            if (!res) {
                try {
                    res = spCreate.call(this);
                } catch (e4) { }
            }
            return res;
        };
        cc.Sprite.__nhGuard = true;
        cc.Sprite.__nhDiscord = true;
    }

    if (typeof cc !== 'undefined' && cc.Sprite && typeof cc.Sprite.createWithSpriteFrameName === 'function' && !cc.Sprite.__nhFrameGuard) {
        var spFrameCreate = cc.Sprite.createWithSpriteFrameName;
        cc.Sprite.createWithSpriteFrameName = function () {
            var res = spFrameCreate.apply(this, arguments);
            if (!res) {
                try {
                    res = cc.Sprite.create();
                } catch (e) { }
            }
            return res;
        };
        cc.Sprite.__nhFrameGuard = true;
    }

    if (typeof channelBinding !== 'undefined' && channelBinding && typeof channelBinding.openURL === 'function' &&
        !channelBinding.__nhDiscord) {
        var openURL = channelBinding.openURL;
        channelBinding.openURL = function (url) {
            if (typeof url === 'string' && /redirectfb/i.test(url)) arguments[0] = DISCORD_URL;
            return openURL.apply(this, arguments);
        };
        channelBinding.__nhDiscord = true;
    }

    if (typeof LoginScene !== 'undefined' && LoginScene.prototype && !LoginScene.prototype.__nhSafeCCB) {
        var origLoginCCB = LoginScene.prototype.onDidLoadFromCCB;
        if (typeof origLoginCCB === 'function') {
            LoginScene.prototype.onDidLoadFromCCB = function () {
                try {
                    return origLoginCCB.apply(this, arguments);
                } catch (err) {
                    if (typeof cc !== 'undefined' && cc.log) cc.log('[NH Error] LoginScene onDidLoadFromCCB caught: ' + err);
                }
            };
            LoginScene.prototype.__nhSafeCCB = true;
        }
    }

    if (typeof MainScene !== 'undefined' && MainScene.prototype && !MainScene.prototype.__nhSafeCCB) {
        var origMainCCB = MainScene.prototype.onDidLoadFromCCB;
        if (typeof origMainCCB === 'function') {
            MainScene.prototype.onDidLoadFromCCB = function () {
                try {
                    return origMainCCB.apply(this, arguments);
                } catch (err) {
                    if (typeof cc !== 'undefined' && cc.log) cc.log('[NH Error] MainScene onDidLoadFromCCB caught: ' + err);
                }
            };
            MainScene.prototype.__nhSafeCCB = true;
        }
    }
}());
// ── NH: Register & Forgot Password -> website ───────────────────────────────────────────
// Tombol Register di layar login (toRegister / btn_signup / btn_create) dan tombol Forgot Password
// (aslinya membuka kageherostudio.com/forgetpass) dialihkan ke website. Pendaftaran akun memang
// tidak ada di server game, jadi form register bawaan hanya menghasilkan request gagal.
// Matikan dengan NH_WEB_LINKS = false. Ganti tujuan lewat REGISTER_URL / FORGOT_URL.
(function installWebLinks() {
    var NH_WEB_LINKS = true;
    var _localWeb = (typeof __NH_BACKEND_CONFIG !== 'undefined' && __NH_BACKEND_CONFIG && __NH_BACKEND_CONFIG.http) ?
        __NH_BACKEND_CONFIG.http.replace(/\/$/, '') + '/' : 'http://192.168.100.87/ninja/';
    var REGISTER_URL = _localWeb, FORGOT_URL = _localWeb;
    if (!NH_WEB_LINKS) return;
    var lastOpen = 0;
    function openWeb(url) {
        var now = Date.now();
        if (now - lastOpen < 1500) return;   // cegah dobel buka browser karena sentuhan ganda
        lastOpen = now;
        try {
            if (typeof channelBinding !== 'undefined' && channelBinding && typeof channelBinding.openURL === 'function')
                channelBinding.openURL(url);
        } catch (e) { }
    }
    if (typeof channelBinding !== 'undefined' && channelBinding && typeof channelBinding.openURL === 'function' &&
        !channelBinding.__nhWebLinks) {
        var prevOpenURL = channelBinding.openURL;
        channelBinding.openURL = function (url) {
            if (typeof url === 'string' && /kageherostudio\.com\/forgetpass/i.test(url)) arguments[0] = FORGOT_URL;
            return prevOpenURL.apply(this, arguments);
        };
        channelBinding.__nhWebLinks = true;
    }
    if (typeof LoginScene !== 'undefined' && LoginScene.prototype && !LoginScene.prototype.__nhWebRegister) {
        var LP = LoginScene.prototype, prevSignup = LP.signup_layer;

        // Izinkan login/register menggunakan username biasa (panjang >= 3) maupun email
        LP.validateMail = function (str) {
            return !!(str && String(str).trim().length >= 3);
        };

        // Bypass validasi password kaku di client side (hilangkan error "You can only use letter or number")
        LP.checkAccountAndPwd = function (preset) {
            var acc = "", pwd = "";
            if (preset && typeof preset === 'object') {
                acc = preset.accId || "";
                pwd = preset.pwd || "";
            } else {
                if (this.mailTTF && typeof this.mailTTF.getText === 'function') {
                    acc = this.mailTTF.getText();
                }
                if (this.pwdTTF1 && typeof this.pwdTTF1.getText === 'function') {
                    pwd = this.pwdTTF1.getText();
                }
            }
            acc = String(acc || "").trim();
            pwd = String(pwd || "").trim();

            if (!acc || acc.length < 3) {
                if (typeof PromptView !== 'undefined' && PromptView.setPageView) {
                    PromptView.setPageView("loginTip", { target: this, text: "Username/Email minimal 3 karakter." });
                }
                return;
            }
            if (!pwd || pwd.length < 1) {
                if (typeof PromptView !== 'undefined' && PromptView.setPageView) {
                    PromptView.setPageView("loginTip", { target: this, text: "Silakan masukkan password." });
                }
                return;
            }

            var channel = 1;
            if (typeof serverUtil !== 'undefined' && serverUtil.getChannel) {
                channel = serverUtil.getChannel();
            }

            return {
                accId: acc.toLowerCase(),
                pwd: pwd.toLowerCase(),
                channel: channel,
                lv: 1
            };
        };

        LP.regCheck = function () {
            var acc = "", pwd1 = "", pwd2 = "";
            if (this.mailTTF && typeof this.mailTTF.getText === 'function') acc = this.mailTTF.getText();
            if (this.pwdTTF1 && typeof this.pwdTTF1.getText === 'function') pwd1 = this.pwdTTF1.getText();
            if (this.pwdTTF2 && typeof this.pwdTTF2.getText === 'function') pwd2 = this.pwdTTF2.getText();

            acc = String(acc || "").trim();
            pwd1 = String(pwd1 || "").trim();
            pwd2 = String(pwd2 || "").trim();

            if (!acc || acc.length < 3) {
                if (typeof PromptView !== 'undefined' && PromptView.setPageView) {
                    PromptView.setPageView("loginTip", { target: this, text: "Username/Email minimal 3 karakter." });
                }
                return;
            }
            if (!pwd1 || pwd1.length < 1) {
                if (typeof PromptView !== 'undefined' && PromptView.setPageView) {
                    PromptView.setPageView("loginTip", { target: this, text: "Silakan masukkan password." });
                }
                return;
            }
            if (pwd1 !== pwd2) {
                if (typeof PromptView !== 'undefined' && PromptView.setPageView) {
                    PromptView.setPageView("loginTip", { target: this, text: "Konfirmasi password tidak cocok." });
                }
                return;
            }

            var channel = 1;
            if (typeof serverUtil !== 'undefined' && serverUtil.getChannel) channel = serverUtil.getChannel();

            return {
                accId: acc.toLowerCase(),
                pwd: pwd1.toLowerCase(),
                channel: channel,
                lv: 1
            };
        };

        LP.onPressToRegister = function () { openWeb(REGISTER_URL); };
        LP.onPressRegister = function () { openWeb(REGISTER_URL); };
        LP.signup_layer = function (show) {
            if (show) { openWeb(REGISTER_URL); return; }
            return typeof prevSignup === 'function' ? prevSignup.apply(this, arguments) : undefined;
        };
        LP.__nhWebRegister = true;
    }
}());
// ── NH: Redeem Code ──────────────────────────────────────────────────────────
// 1) Tombol "Redeem" di menu bawah layar rumah (slot paling kiri, di kiri tombol Costume).
//    Disisipkan ke touchList/posList HomeMenu supaya ikut animasi buka/tutup menu.
// 2) Memakai ulang dialog bawaan `cardCode` (InputCardCodeLayer), tapi mengirim `redeemCode`
//    ke server (bukan `newerGift`) dan kode boleh 3–32 karakter (bukan wajib 16).
// 3) Jawaban server `redeemResult` {res, msg} ditampilkan sebagai toast; dialog ditutup bila berhasil.
(function installRedeemCode() {
    var BTN_IMAGE = 'image/ibg/nh_redeem.png', BTN_TAG = 'nhRedeem';
    function toast(t) { try { PromptBox.getInstance().updataTxt(t); } catch (e) { } }

    // jawaban server
    if (typeof GameConnection !== 'undefined' && typeof GameConnection.handleGameCommand === 'function' &&
        !GameConnection.__nhRedeem) {
        var reduce = GameConnection.handleGameCommand;
        GameConnection.handleGameCommand = function (key, value) {
            if (key === 'redeemResult') {
                try {
                    toast((value && value.msg) || 'Redeem failed.');
                    if (value && Number(value.res) === 0) PromptView.setPageView(null);
                } catch (e) { }
                return;
            }
            return reduce.apply(this, arguments);
        };
        GameConnection.__nhRedeem = true;
    }

    // dialog kode: kirim ke server, panjang bebas
    if (typeof InputCardCodeLayer !== 'undefined' && InputCardCodeLayer.prototype &&
        !InputCardCodeLayer.prototype.__nhRedeem) {
        var cp = InputCardCodeLayer.prototype, initUI = cp.initUI;
        cp.initUI = function () {
            var r = initUI.apply(this, arguments);
            try {
                this.inputbox.setMaxLength(32);
                this.inputbox.setPlaceHolder('Enter redeem code');
            } catch (e) { }
            return r;
        };
        cp.send = function () {
            var code = '';
            try { code = String(this.inputbox.getText() || '').replace(/\s+/g, ''); } catch (e) { }
            if (code.length < 3 || code.length > 32) { toast('Please enter a valid redeem code.'); return; }
            GameConnection.send('redeemCode', { code: code });
            try { this.inputbox.setText(''); } catch (e) { }
        };
        cp.__nhRedeem = true;
    }

    // tombol di HomeMenu
    if (typeof HomeMenu !== 'undefined' && HomeMenu.prototype && !HomeMenu.prototype.__nhRedeem) {
        var hp = HomeMenu.prototype, buildUI = hp.buildUI, touchEnded = hp.onTouchesEnded;
        hp.buildUI = function () {
            var r = buildUI.apply(this, arguments);
            try {
                var c = this.controller, ref = c.costume, next = c.paihangbang;
                if (!ref || !next || this.nhRedeemBtn || !this.touchList || !this.posList) return r;
                var sprite = cc.Sprite.create(BTN_IMAGE);
                if (!sprite) return r;
                // Saat buildUI selesai menu bisa sedang tertutup (semua tombol ditumpuk di posisi X),
                // jadi pakai posisi ASLI dari posList, bukan getPosition() tombol.
                var i1 = this.touchList.indexOf(ref), i2 = this.touchList.indexOf(next);
                if (i1 < 0 || i2 < 0 || !this.posList[i1] || !this.posList[i2]) return r;
                var rp = this.posList[i1], np = this.posList[i2];
                var pos = cc.p(rp.x - Math.abs(np.x - rp.x), rp.y);
                sprite.setAnchorPoint(ref.getAnchorPoint());
                sprite.setScale(ref.getScale());
                sprite.setPosition(pos);
                ref.getParent().addChild(sprite, ref.getLocalZOrder ? ref.getLocalZOrder() : 0);
                sprite._ty = BTN_TAG;
                var at = this.posList.length;               // tepat setelah tombol menu terakhir
                this.touchList.splice(at, 0, sprite);
                this.posList.push(pos);
                if (BuildData.getInstance().menuStatus == 0) {   // menu sedang tertutup: ikut sembunyi
                    sprite.setVisible(false);
                    sprite.setPosition(this.defaultPos);
                }
                this.nhRedeemBtn = sprite;
            } catch (e) { }
            return r;
        };
        hp.onTouchesEnded = function (touches) {
            var t = this.touchTarget;
            var res = touchEnded.apply(this, arguments);
            try {
                if (t && t._ty === BTN_TAG && t.isVisible() &&
                    GameTools.getInstance().onTouchesHit(touches[0], [t]) === t) {
                    AudioEngine.getInstance().playerEffectSound('click');
                    PromptView.setPageView('cardCode');
                }
            } catch (e) { }
            return res;
        };
        hp.__nhRedeem = true;
    }
}());
// ════════════════════════════════════════════════════════════════════════════
// NH DELETE NINJA — tab "Delete" di layar Ninja (ZhuangBeiScene)
//
// Tab baru di sebelah kanan "Costume". Panel: daftar semua ninja (kualitas terendah dulu), sentuh untuk
// memilih, Select Page / Clear, lalu "Delete" -> konfirmasi -> GameConnection.send('deleteHeroes', {hids}).
// Server menukar TIAP ninja menurut rank-nya (REWARDS di bawah harus sama dengan DELETE_REWARDS di backend;
// di sini hanya untuk teks tampilan, server yang menentukan hadiah sebenarnya): UR = 1000 gold + 50 Stamina Bag,
// SSS = 500 gold + 25 bag, SS = 250 gold + 10 bag, rank lain (D/C/B/A/S) = 50.000 silver.
// Balasan server: operResult tipe 61 (param: n, gold, silver, bags).
// Ninja di formasi / rings / Deploy aktif atau yang masih memakai equipment dikunci (ditolak juga oleh server).
// Gambar tab: image/ibg/nh_del_tab_{off,on}.png (134x62). Kalau file tidak ada -> tab cadangan berwarna polos.
// Sintaks ES5 saja (SpiderMonkey 22). Semua dibungkus try/catch: kalau gagal, layar Ninja tetap normal.
// ════════════════════════════════════════════════════════════════════════════
(function () {
    'use strict';
    if (typeof ZhuangBeiScene === 'undefined' || !ZhuangBeiScene.prototype || ZhuangBeiScene.prototype.__nhDelete ||
        typeof cc === 'undefined')
        return;
    var DEL_OP = 61, COLS = 5, ROWS = 7, PER_PAGE = COLS * ROWS, WARN_QUALITY = 7;
    var REF = { tabW: 83, left: -391, right: 208.5, top: 21, bottom: 358 };         // px screenshot 627x396, relatif ke tab Costume (panel menutup seluruh isi dialog)
    var HIDE = ['roleContainer', 'inforContainer', 'accContainer', 'mergeContainer', 'costumeContainer', 'roleProps', 'roleTrainProps', 'roleTrain'];
    var PAIRS = [['rwBtn', 'rwBtn0'], ['accBtn', 'accBtn0'], ['trainBtn', 'trainBtn0'], ['mergeBtn', 'mergeBtn0'], ['costumeBtn', 'costumeBtn0']];
    var FAR = 30000;
    var QCOL = [null, [190, 190, 190], [120, 220, 120], [110, 170, 255], [200, 130, 255], [255, 170, 60], [255, 90, 80], [255, 220, 90], [255, 120, 220]];
    var RANKS = ['', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'UR'];
    var REWARDS = { 8: { gold: 1000, bags: 50 }, 7: { gold: 500, bags: 25 }, 6: { gold: 250, bags: 10 } };   // kualitas -> hadiah
    var REWARD_DEFAULT = { silver: 50000 };
    var proto = ZhuangBeiScene.prototype;
    var initUI = proto.initUI, touchEnded = proto.onTouchesEnded, touchBegan = proto.onTouchesBegan,
        touchMoved = proto.onTouchesMoved, showBtn = proto.showBtn, removeMe = proto.onRemoveMe;
    var current = null, pending = null;

    function log(msg) { try { if (typeof console !== 'undefined' && console.log) console.log(msg); } catch (e) { } }
    function toast(msg) { try { PromptBox.getInstance().updataTxt(msg); } catch (e) { } }
    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function rewardOf(q) { return REWARDS[q] || REWARD_DEFAULT; }
    function totalOf(list) {
        var t = { gold: 0, silver: 0, bags: 0 };
        for (var i = 0; i < list.length; i++) {
            var r = rewardOf(list[i].q);
            t.gold += r.gold || 0; t.silver += r.silver || 0; t.bags += r.bags || 0;
        }
        return t;
    }
    function rewardText(t) {
        var parts = [];
        if (t.gold) parts.push(fmt(t.gold) + ' gold');
        if (t.silver) parts.push(fmt(t.silver) + ' silver');
        if (t.bags) parts.push(fmt(t.bags) + ' Stamina Bag');
        return parts.length ? parts.join(' + ') : 'nothing';
    }
    function click() { try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) { } }
    function c3(a) { return cc.c3b(a[0], a[1], a[2]); }
    function label(text, size, color, ax, x, y, parent) {
        var l = cc.LabelTTF.create(text, 'Helvetica', size);
        l.setAnchorPoint(cc.p(ax, 0.5));
        l.setPosition(cc.p(x, y));
        if (color) l.setColor(c3(color));
        parent.addChild(l, 2);
        return l;
    }
    function rect(w, h, r, g, b, a) {
        var n = cc.LayerColor.create(cc.c4b(r, g, b, a === undefined ? 255 : a), w, h);
        return n;
    }
    function inside(node, touch, w, h) {
        if (!node || !touch || !touch.getLocation) return false;
        var p = node.convertToNodeSpace(touch.getLocation());
        return p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h;
    }

    // ── data ninja ──────────────────────────────────────────────────────────
    function inTeam(roles, key) {
        var lists = [roles.mars, roles.rings, roles.aids], k = String(key);
        for (var i = 0; i < lists.length; i++) {
            var l = lists[i];
            if (!l) continue;
            for (var j = 0; j < l.length; j++)
                if (l[j] != null && l[j] !== '' && String(l[j]) === k) return true;
        }
        return false;
    }
    function wearsEquip(hero) {
        var eq = hero && hero.equip;
        if (!eq) return false;
        for (var i = 0; i < eq.length; i++) if (eq[i] && eq[i].id) return true;
        return false;
    }
    function heroName(def, rid) {
        var n = def && def.alt;                       // client memakai roleObject[id].alt sebagai nama ninja
        if (typeof n === 'string' && n) return n;
        n = def && def.name;
        if (typeof n === 'string' && n && !/^\d+$/.test(n)) return n;
        return 'Ninja ' + rid;
    }
    function collect() {
        var roles = RoleData.getInstance(), list = roles.heroList || [], out = [];
        for (var i = 0; i < list.length; i++) {
            var key = list[i], hero = roles.heros && roles.heros[key];
            if (!hero) continue;
            var rid = roles.getRoleID(key), def = Config.getInstance().roleObject[rid], q = 1;
            try { q = Number(roles.getQuality(def && def.quality, key)) || 1; } catch (e) { q = Number(def && def.quality) || 1; }
            var lock = inTeam(roles, key) ? 'In team' : (wearsEquip(hero) ? 'Equipped' : null);
            out.push({ key: key, name: heroName(def, rid), lv: Number(hero.lv) || 1, q: q, lock: lock });
        }
        out.sort(function (a, b) { return a.q - b.q || a.lv - b.lv || Number(a.key) - Number(b.key); });
        return out;
    }

    // ── tab ─────────────────────────────────────────────────────────────────
    function makeTabSprite(on) {
        var s = null;
        try { s = cc.Sprite.create('image/ibg/nh_del_tab_' + (on ? 'on' : 'off') + '.png'); } catch (e) { s = null; }
        if (s && s.getContentSize().width > 0) return s;
        var f = rect(134, 62, on ? 190 : 235, on ? 110 : 225, on ? 40 : 210);       // cadangan kalau gambar tidak ada
        f.ignoreAnchorPointForPosition(false);
        f.setAnchorPoint(cc.p(0.5, 0.5));
        label('Delete', 26, on ? [255, 255, 255] : [90, 50, 30], 0.5, 67, 31, f);
        return f;
    }
    function geometry(scene) {
        var tab = scene.costumeBtn, par = tab && tab.getParent();
        if (!tab || !par) return null;
        var cs = tab.getContentSize(), ax = tab.getAnchorPoint(), pos = tab.getPosition();
        var sx = Math.abs(tab.getScaleX()) || 1, w = cs.width > 20 && cs.width < 400 ? cs.width : 134;
        var cx = pos.x + (0.5 - ax.x) * w * sx, cy = pos.y + (0.5 - ax.y) * (cs.height || 62) * (Math.abs(tab.getScaleY()) || 1);
        var u = w * sx / REF.tabW, dx = w * sx, m = scene.mergeBtn;
        if (m && m.getParent() === par) {
            var d = pos.x - m.getPosition().x;
            if (Math.abs(d) > 20 && Math.abs(d) < 400) dx = d;
        }
        return { par: par, cx: cx, cy: cy, u: u, dx: dx, z: (tab.getZOrder ? tab.getZOrder() : 0) };
    }
    function buildTab(scene) {
        var g = geometry(scene);
        if (!g) return;
        var off = makeTabSprite(false), on = makeTabSprite(true);
        on.setVisible(false);
        off.setPosition(cc.p(g.cx + g.dx, g.cy));
        on.setPosition(cc.p(g.cx + g.dx, g.cy));
        g.par.addChild(off, g.z + 1);
        g.par.addChild(on, g.z + 1);
        var size = off.getContentSize();
        scene.__nhDel = { dead: false, open: false, g: g, tabOff: off, tabOn: on, tabW: size.width, tabH: size.height,
            sel: {}, page: 0, panel: null, grid: null, hits: [], pw: 0, ph: 0 };
    }
    function tabHit(scene, touch) {
        var st = scene.__nhDel;
        return !!st && inside(st.tabOff, touch, st.tabW, st.tabH);
    }
    function setTab(st, active) {
        st.tabOn.setVisible(active);
        st.tabOff.setVisible(!active);
    }

    // ── panel ───────────────────────────────────────────────────────────────
    function ensurePanel(scene) {
        var st = scene.__nhDel;
        if (st.panel) return;
        var g = st.g, u = g.u, W = (REF.right - REF.left) * u, H = (REF.bottom - REF.top) * u;
        var panel = rect(W, H, 52, 36, 24, 255);
        panel.setPosition(cc.p(g.cx + REF.left * u, g.cy - REF.bottom * u));
        var frame = rect(W - 6, H - 6, 92, 66, 44, 255);
        frame.setPosition(cc.p(3, 3));
        panel.addChild(frame, 0);
        g.par.addChild(panel, g.z + 50);
        st.panel = panel; st.pw = W; st.ph = H;
        panel.setVisible(false);
    }
    function shade(c, k, add) { return [Math.min(255, Math.round(c[0] * k + add)), Math.min(255, Math.round(c[1] * k + add)), Math.min(255, Math.round(c[2] * k + add))]; }
    function addButton(scene, text, x, y, w, h, color, fn, enabled, bold) {
        var st = scene.__nhDel, on = enabled !== false;
        var base = on ? color : shade(color, 0.42, 22), edge = shade(base, 0.55, 0), top = shade(base, 1.0, on ? 34 : 10);
        var b = rect(w, h, edge[0], edge[1], edge[2], 255);                       // bingkai gelap = hit area
        b.setPosition(cc.p(x, y));
        var body = rect(w - 4, h - 6, base[0], base[1], base[2], 255);            // badan tombol
        body.setPosition(cc.p(2, 4));
        b.addChild(body, 1);
        var shine = rect(w - 4, Math.max(2, Math.round(h * 0.12)), top[0], top[1], top[2], 255);   // sorotan di sisi atas
        shine.setPosition(cc.p(2, h - 2 - Math.max(2, Math.round(h * 0.12))));
        b.addChild(shine, 2);
        label(text, Math.round(h * (bold ? 0.5 : 0.44)), on ? [255, 255, 255] : [175, 155, 140], 0.5, w / 2, h / 2 + 1, b);
        st.grid.addChild(b, 3);
        if (on) st.hits.push({ node: b, w: w, h: h, fn: fn });
        return b;
    }
    function selectedKeys(st, items) {
        var out = [];
        for (var i = 0; i < items.length; i++) if (st.sel[String(items[i].key)] && !items[i].lock) out.push(items[i]);
        return out;
    }
    function refresh(scene) {
        var st = scene.__nhDel;
        if (!st || st.dead || !st.open || !st.panel) return;
        var panel = st.panel, W = st.pw, H = st.ph, u = st.g.u, fs = Math.max(12, Math.round(11 * u)), small = Math.max(10, Math.round(9 * u));
        if (st.grid) panel.removeChild(st.grid, true);
        st.grid = cc.Node.create();
        panel.addChild(st.grid, 1);
        st.hits = [];
        var items = collect(), roles = RoleData.getInstance(), i;
        var valid = {};
        for (i = 0; i < items.length; i++) valid[String(items[i].key)] = true;
        for (var k in st.sel) if (st.sel.hasOwnProperty(k) && !valid[k]) delete st.sel[k];
        var pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
        if (st.page >= pages) st.page = pages - 1;
        if (st.page < 0) st.page = 0;
        var chosen = selectedKeys(st, items), n = chosen.length;

        // header
        var slots = Number(roles.max) || 0;
        label('Delete Ninja', Math.round(fs * 1.15), [255, 230, 150], 0, W * 0.04, H * 0.935, st.grid);
        label('Ninja: ' + items.length + (slots ? ' / ' + slots : ''), fs, (slots && items.length >= slots) ? [255, 110, 100] : [210, 255, 210], 1, W * 0.96, H * 0.935, st.grid);
        label('UR: 1000 gold + 50 Stamina Bag  |  SSS: 500 + 25  |  SS: 250 + 10', small, [235, 215, 180], 0, W * 0.04, H * 0.892, st.grid);
        label('Other ranks: 50,000 silver.  Ninja in team / with equipment are locked.', small, [235, 215, 180], 0, W * 0.04, H * 0.856, st.grid);

        // grid
        var gx = W * 0.03, gw = W * 0.94, gtop = H * 0.83, gh = H * 0.6, cw = gw / COLS, chh = gh / ROWS, pad = 3;
        var from = st.page * PER_PAGE;
        for (i = 0; i < PER_PAGE && from + i < items.length; i++) {
            var it = items[from + i], col = i % COLS, row = Math.floor(i / COLS);
            var chosenNow = !!st.sel[String(it.key)] && !it.lock;
            var bg = it.lock ? [66, 60, 56] : (chosenNow ? [160, 52, 44] : [112, 80, 52]);
            var cell = rect(cw - pad * 2, chh - pad * 2, bg[0], bg[1], bg[2], 255);
            cell.setPosition(cc.p(gx + col * cw + pad, gtop - (row + 1) * chh + pad));
            var maxChars = Math.max(6, Math.floor((cw - pad * 2 - 12) / ((small + 1) * 0.56)));
            var nm = it.name.length > maxChars ? it.name.substring(0, maxChars - 1) + '..' : it.name;
            var qc = QCOL[Math.min(8, Math.max(1, it.q))];
            label((chosenNow ? '[X] ' : '') + nm, small + 1, it.lock ? [150, 150, 150] : qc, 0, 6, (chh - pad * 2) * 0.68, cell);
            label('Lv.' + it.lv + '  ' + (RANKS[Math.min(8, Math.max(1, it.q))] || '') + (it.lock ? '  (' + it.lock + ')' : ''), small, it.lock ? [190, 140, 120] : [240, 230, 210], 0, 6, (chh - pad * 2) * 0.28, cell);
            st.grid.addChild(cell, 2);
            if (!it.lock) st.hits.push({ node: cell, w: cw - pad * 2, h: chh - pad * 2, fn: (function (key) {
                return function () { var s = String(key); if (st.sel[s]) delete st.sel[s]; else st.sel[s] = true; refresh(scene); };
            }(it.key)) });
        }
        if (!items.length) label('No ninja.', fs, [230, 230, 230], 0.5, W / 2, H * 0.5, st.grid);

        // footer: baris A = navigasi + pilih, baris B = ringkasan + Delete (semua berjarak dari tepi panel)
        var bh = H * 0.066, rowA = H * 0.122, rowB = H * 0.036, m = W * 0.035;
        var bw = W * 0.15, gap = W * 0.015, x = m;
        addButton(scene, 'Prev', x, rowA, bw, bh, [78, 108, 160], function () { st.page--; refresh(scene); }, st.page > 0);
        x += bw + gap;
        label('Page ' + (st.page + 1) + '/' + pages, small + 1, [255, 255, 255], 0.5, x + W * 0.07, rowA + bh / 2, st.grid);
        x += W * 0.14 + gap;
        addButton(scene, 'Next', x, rowA, bw, bh, [78, 108, 160], function () { st.page++; refresh(scene); }, st.page < pages - 1);
        var selW = W * 0.22, clrW = W * 0.14;
        addButton(scene, 'Clear', W - m - clrW, rowA, clrW, bh, [140, 104, 70], function () { st.sel = {}; refresh(scene); }, n > 0);
        addButton(scene, 'Select Page', W - m - clrW - gap - selW, rowA, selW, bh, [64, 128, 78], function () {
            for (var j = 0; j < PER_PAGE && from + j < items.length; j++) if (!items[from + j].lock) st.sel[String(items[from + j].key)] = true;
            refresh(scene);
        }, true);
        label(n ? 'Selected ' + n + ': ' + rewardText(totalOf(chosen)) : 'Tap ninja to select.', small, n ? [255, 235, 150] : [220, 205, 180], 0, m, rowB + bh / 2, st.grid);
        var delW = W * 0.3;
        addButton(scene, n ? 'Delete (' + n + ')' : 'Delete', W - m - delW, rowB, delW, bh, [196, 56, 44], function () { askConfirm(scene, chosen); }, n > 0 && !pending, true);
    }
    function askConfirm(scene, chosen) {
        if (pending || !chosen.length) return;
        var n = chosen.length, high = 0;
        for (var i = 0; i < n; i++) if (chosen[i].q >= WARN_QUALITY) high++;
        scene.__nhDelAsk = chosen;
        scene.__nhDelConfirm = function () { send(scene); };
        PromptView.setPageView('tip', { txt: (high ? 'Includes ' + high + ' SSS/UR ninja! ' : '') + 'Delete ' + n + ' ninja for ' + rewardText(totalOf(chosen)) +
            '? This cannot be undone.', target: scene, fun: '__nhDelConfirm' });
    }
    function send(scene) {
        var chosen = scene.__nhDelAsk, st = scene.__nhDel;
        if (!st || st.dead || !chosen || !chosen.length || pending) return;
        var ids = [];
        for (var i = 0; i < chosen.length; i++) ids.push(Number(chosen[i].key));
        pending = { scene: scene, n: ids.length, at: Date.now() };
        GameConnection.send('deleteHeroes', { hids: ids });
        scene.__nhDelAsk = null;
    }

    // ── buka / tutup ────────────────────────────────────────────────────────
    // Delete = layar sendiri: semua kontainer halaman Ninja (daftar kiri, info + PageView hero, Equipment, Merging,
    // Costume, Training) dipindah jauh dari layar & disembunyikan, jadi tidak ada node di belakang panel yang
    // bisa menerima / menelan sentuhan. closeDelete mengembalikan posisi & visibilitas persis seperti semula.
    function hideScene(scene, st) {
        st.hidden = [];
        for (var i = 0; i < HIDE.length; i++) {
            var n = scene[HIDE[i]];
            if (!n || !n.getPosition || !n.setPosition) continue;
            try {
                var pos = n.getPosition(), vis = n.isVisible();
                if (n.stopAllActions) n.stopAllActions();           // MoveTo showBtn yang masih jalan tidak boleh menarik balik
                st.hidden.push({ node: n, x: pos.x, y: pos.y, vis: vis });
                n.setPosition(cc.p(pos.x + FAR, pos.y));
                n.setVisible(false);
            } catch (e) { }
        }
    }
    function restoreScene(st) {
        var h = st.hidden || [];
        for (var i = 0; i < h.length; i++) {
            try {
                if (h[i].node.stopAllActions) h[i].node.stopAllActions();
                h[i].node.setPosition(cc.p(h[i].x, h[i].y));
                h[i].node.setVisible(h[i].vis);
            } catch (e) { }
        }
        st.hidden = [];
    }
    function unselectCurrentTab(scene) {            // tab halaman Ninja yang aktif tampil sebagai tidak terpilih
        try {
            var cur = Math.max(0, Math.min(4, Number(scene.showIdx) || 0)), other = PAIRS[(cur + 1) % 5];
            var from = [scene[other[0]], scene[other[1]]], to = [scene[PAIRS[cur][0]], scene[PAIRS[cur][1]]];
            if (from[0] && from[1] && to[0] && to[1]) {
                to[0].setVisible(from[0].isVisible());
                to[1].setVisible(from[1].isVisible());
            }
        } catch (e) { }
    }
    function openDelete(scene) {
        var st = scene.__nhDel;
        if (!st || st.dead || st.open) return;
        click();
        ensurePanel(scene);
        hideScene(scene, st);
        unselectCurrentTab(scene);
        st.open = true; st.page = 0;
        st.panel.setVisible(true);
        setTab(st, true);
        refresh(scene);
    }
    function closeDelete(scene) {
        var st = scene.__nhDel;
        if (!st || !st.open) return;
        st.open = false;
        if (st.panel) st.panel.setVisible(false);
        setTab(st, false);
        restoreScene(st);
    }
    function panelTouch(scene, touch) {
        var st = scene.__nhDel;
        if (!st || !st.open || !st.panel) return false;
        return inside(st.panel, touch, st.pw, st.ph);
    }

    // ── pasang ke ZhuangBeiScene ────────────────────────────────────────────
    proto.initUI = function () {
        var r = initUI.apply(this, arguments);
        current = this;
        try { buildTab(this); } catch (e) { this.__nhDel = null; log('NH_DELETE_TAB_FAILED ' + e); }
        return r;
    };
    proto.showBtn = function (idx) {
        var st = this.__nhDel;
        if (st && st.open) {
            closeDelete(this);
            if (this.showIdx === idx) this.showIdx = -1;     // paksa showBtn asli menggambar ulang tab yang sama
        }
        return showBtn.apply(this, arguments);
    };
    proto.onTouchesBegan = function (touches) {
        var st = this.__nhDel;
        if (st && st.open && panelTouch(this, touches && touches[0])) return;
        return touchBegan.apply(this, arguments);
    };
    proto.onTouchesMoved = function (touches) {
        var st = this.__nhDel;
        if (st && st.open && panelTouch(this, touches && touches[0])) return;
        return touchMoved.apply(this, arguments);
    };
    proto.onTouchesEnded = function (touches) {
        var st = this.__nhDel, t = touches && touches[0];
        if (st && !st.dead) {
            try {
                if (st.open && panelTouch(this, t)) {
                    for (var i = 0; i < st.hits.length; i++) {
                        var h = st.hits[i];
                        if (inside(h.node, t, h.w, h.h)) { click(); h.fn(); break; }
                    }
                    return;
                }
                if (tabHit(this, t)) { openDelete(this); return; }
            } catch (e) { log('NH_DELETE_TOUCH_FAILED ' + e); }
        }
        return touchEnded.apply(this, arguments);
    };
    proto.onRemoveMe = function () {
        if (this.__nhDel) this.__nhDel.dead = true;
        if (current === this) current = null;
        if (pending && pending.scene === this) pending = null;
        return removeMe.apply(this, arguments);
    };

    // ── balasan server (operResult tipe 61) + perubahan daftar hero ─────────
    var dispatch = GameConnection.handleGameCommand;
    GameConnection.handleGameCommand = function (key, value) {
        var result = dispatch.apply(this, arguments);
        try {
            if (key === 'operResult' && value && Number(value.type) === DEL_OP) {
                var job = pending; pending = null;
                try { if (PromptView.page === 'loading') PromptView.setPageView(null); } catch (e) { }
                if (Number(value.res) === 0) {
                    var p = value.param || {};
                    toast('Deleted ' + (p.n || (job && job.n) || 0) + ' ninja: ' + rewardText({ gold: p.gold || 0, silver: p.silver || 0, bags: p.bags || 0 }) + '.');
                    if (current && current.__nhDel) current.__nhDel.sel = {};
                } else {
                    var msgs = { 1: 'Invalid selection.', 2: 'Some ninja no longer exist.', 3: 'Some ninja are in your team.', 4: 'Remove equipment from the selected ninja first.', 5: 'Not enough bag space for the Stamina Bags. Free up item slots first.' };
                    toast(msgs[Number(value.res)] || 'Delete failed.');
                }
                if (current) refresh(current);
            }
            else if (key === 'heros' && current && current.__nhDel && current.__nhDel.open)
                refresh(current);
            if (pending && Date.now() - pending.at > 15000) pending = null;   // jaga-jaga kalau balasan hilang
        }
        catch (e) { log('NH_DELETE_RESULT_FAILED ' + e); }
        return result;
    };
    proto.__nhDelete = true;
}());

// ═════════════════════════════════════════════════════════════════════════════
// FIGHT TO FIGHT — modul klien (ditempel di akhir backend-adapter.js, gaya sama dgn installRedeemCode)
//   • popup ACCEPT/DECLINE muncul di layar mana pun saat ditantang
//   • setelah Accept, kedua pemain otomatis pindah ke layar duel (server kirim `fightStart`)
//   • duel live 3 ninja lawan 3 ninja: tekan tombol skill, bergantian, recovery (dihitung server), tanpa batas waktu
//   • animasi jurus diputar PENUH; server menunggu laporan fightAnimDone dari kedua klien sebelum giliran berikutnya
//   • lobi gedung "Fight Arena": ranking win rate, daftar online, Quick Match, pilih hadiah rank 1-3
// Semua UI digambar lewat kode + gambar desain sendiri di image/ibg/nh_fight_*.png.
// ═════════════════════════════════════════════════════════════════════════════
(function installFightToFight() {
    if (typeof GameConnection === 'undefined' || GameConnection.__nhFight) return;
    var IMG = 'image/ibg/', Z = 99990, BTN_TAG = 'nhFight', ZB = 0;   // ZB = tambahan z-order tombol (layar hasil duel)
    var S = { data: null, tab: 0, page: 0, lobby: null, invite: null, inviteMsg: null, reward: null, picks: [], rpage: 0, fight: null, F: null, speed: 1.8 };

    // ── util ────────────────────────────────────────────────────────────────
    function dir() { return cc.Director.getInstance(); }
    function WS() { return dir().getWinSize(); }
    function scene() { try { return dir().getRunningScene(); } catch (e) { return null; } }
    function toast(t) { try { PromptBox.getInstance().updataTxt(t); } catch (e) { } }
    function send(k, v) { try { GameConnection.send(k, v || {}); } catch (e) { } }
    function click() { try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) { } }
    function spr(p) { try { return cc.Sprite.create(p); } catch (e) { return null; } }
    function fitTo(s, w, h) { var c = s.getContentSize(); if (c.width > 0 && c.height > 0) { s.setScaleX(w / c.width); s.setScaleY(h / c.height); } }
    function kill(k) { try { if (S[k]) { if (S[k].getParent()) S[k].removeFromParent(true); } } catch (e) { } S[k] = null; if (k === 'fight') applyScale(1); }
    // kecepatan duel: pakai time scale scheduler game (sama seperti tombol Speed di arena); selalu dikembalikan ke 1 saat keluar duel
    function applyScale(v) { try { cc.Director.getInstance().getScheduler().setTimeScale(v); } catch (e) { } }
    // kecepatan duel = kecepatan arena bawaan: GameData.animationSp (default 1.2, ikut pengaturan pemain)
    // dari perbandingan video: jurus yang sama di arena ~1.5-1.9x lebih cepat dari 1.2. Duel memakai yang terbesar antara kecepatan arena pemain dan batas bawah ini.
    var FIGHT_SPEED_MIN = 2.4;  // tempo PVE (tombol 2x = spDefault 1.2 x 2): jurus Huge Uzuhiko di PVE 3.3 dtk (diukur dari video); duel pakai yang terbesar antara setelan pemain & ini
    // ── efek layar penuh (sceneEffect) ──────────────────────────────────────────────────────────
    // Banyak armature efek layar penuh membawa bitmap HITAM PEKAT seukuran layar. Dulu efek dipasang di z=10
    // (di atas ninja & HUD) => seluruh arena tertutup hitam selama jurus. Pilihan:
    //   'dim'  (default) = efek tetap tampil tapi di BELAKANG ninja & HUD, semi-transparan, durasi dibatasi, 1 efek aktif sekaligus
    //   'off'            = efek layar penuh dimatikan total (tidak ada blackout sama sekali)
    //   'full'           = perilaku lama (layar hitam penuh di atas segalanya)
    var FIGHT_SCENE = 'full';   // DIUBAH dari 'dim': PVE memutar efek layar penuh (sceneEffect) penuh & di atas medan; mode 'dim' memotongnya (1,8 dtk, transparan, di belakang ninja)
    var SCENE_Z = 3;            // z-order efek layar penuh di mode 'dim' (latar=0, HUD=4+, ninja=5)
    var SCENE_OPACITY = 150;    // 0-255; makin kecil makin transparan (arena makin kelihatan)
    var SCENE_MAX_MS = 1800;    // batas tampil efek layar penuh di mode 'dim' (ms, sebelum dibagi kecepatan duel)
    var SCENE_FULL_MAX_MS = 8000;   // mode 'full': pengaman saja (efek hilang sendiri saat animasinya selesai); jurus MENUNGGU efek ini selesai
    var EFFECT_MAX_MS = 12000;      // pengaman efek biasa (dulu 5000 -> efek panjang terpotong)
    function arenaSpeed() { try { var v = Number(GameData.getInstance().animationSp); if (v > 0 && v <= 4) return v; } catch (e) { } return 1.2; }
    function sd(ms) { return ms / (S.speed || 1); }
    function c3(r, g, b) { return cc.c3b(r, g, b); }
    var GOLD = c3(255, 226, 130), WHITE = c3(255, 255, 255), GREY = c3(190, 190, 190), RED = c3(255, 110, 100), GREEN = c3(130, 240, 140);

    function lbl(txt, size, col, x, y, ax, ay) {
        var l = cc.LabelTTF.create(String(txt), 'Arial', size);
        l.setColor(col || WHITE); l.setAnchorPoint(cc.p(ax == null ? 0.5 : ax, ay == null ? 0.5 : ay)); l.setPosition(cc.p(x, y));
        return l;
    }
    function box(r, g, b, a, w, h, x, y) {                    // x,y = pojok kiri-bawah
        var n = cc.LayerColor.create(cc.c4b(r, g, b, a), w, h); n.setPosition(cc.p(x, y)); return n;
    }
    function bg(L, file, w, h) {
        var s = spr(IMG + file);
        if (s) { s.setAnchorPoint(cc.p(0, 0)); s.setPosition(cc.p(0, 0)); var c = s.getContentSize(), k = Math.max(w / c.width, h / c.height); s.setScale(k); s.setPosition(cc.p((w - c.width * k) / 2, (h - c.height * k) / 2)); L.addChild(s, 0); }
    }
    function head(name) { return name ? spr('image/iroleHead/' + name + '_h.png') : null; }

    // layer layar-penuh yang menelan sentuhan; tombol = persegi hit (x,y,w,h = kiri-bawah)
    function overlay(color) {
        var sz = WS(), L = cc.LayerColor.create(color || cc.c4b(0, 0, 0, 175), sz.width, sz.height);
        L.btns = [];
        try { L.setTouchMode(cc.TOUCH_ONE_BY_ONE); } catch (e) { }
        try { L.setTouchEnabled(true); } catch (e) { }
        L.onTouchBegan = function () { return true; };
        L.onTouchMoved = function () { };
        L.onTouchEnded = function (t) {
            var p = t.getLocation();
            for (var i = L.btns.length - 1; i >= 0; i--) {
                var b = L.btns[i];
                if (b.on !== false && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { click(); b.fn(); return; }
            }
        };
        return L;
    }
    function attach(L) {
        var sc = scene(); if (!sc || !L) return false;
        try { if (L.getParent() !== sc) { if (L.getParent()) L.removeFromParent(false); sc.addChild(L, Z); } return true; } catch (e) { return false; }
    }
    // tombol: cx,cy = tengah
    function button(L, text, cx, cy, w, h, img, fn, size, enabled) {
        var s = spr(IMG + img);
        if (s) { fitTo(s, w, h); s.setPosition(cc.p(cx, cy)); if (enabled === false) s.setOpacity(110); L.addChild(s, ZB + 2); }
        else L.addChild(box(200, 120, 40, enabled === false ? 110 : 255, w, h, cx - w / 2, cy - h / 2), ZB + 2);
        L.addChild(lbl(text, size || 24, enabled === false ? GREY : WHITE, cx, cy), ZB + 3);
        L.btns.push({ x: cx - w / 2, y: cy - h / 2, w: w, h: h, fn: fn, on: enabled !== false });
    }
    function clear(L) { try { L.removeAllChildren(true); } catch (e) { try { L.removeAllChildrenWithCleanup(true); } catch (e2) { } } L.btns = []; }
    function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
    function days(ms) { var h = Math.floor(ms / 3600000), d = Math.floor(h / 24); return d + 'd ' + (h % 24) + 'h'; }

    // ═════════════════════════ POPUP ACCEPT / DECLINE ═════════════════════════
    function showInvite(v) {
        if (!v) return;
        if (v.close) { if (!S.invite || S.inviteId === v.id) { kill('invite'); } return; }
        S.inviteEnd = Date.now() + (v.left || 0);
        if (S.invite && S.inviteId === v.id && attach(S.invite)) return;           // ping ulang server: cukup pastikan masih tampil
        kill('invite'); S.inviteId = v.id;
        var sz = WS(), W = sz.width, H = sz.height, L = overlay(cc.c4b(0, 0, 0, 150)), cx = W / 2, cy = H / 2;
        var pw = Math.min(W - 40, 520), ph = 330;
        L.addChild(box(30, 18, 26, 245, pw, ph, cx - pw / 2, cy - ph / 2), 1);
        L.addChild(box(250, 200, 80, 255, pw, 4, cx - pw / 2, cy + ph / 2 - 4), 2);
        L.addChild(box(250, 200, 80, 255, pw, 4, cx - pw / 2, cy - ph / 2), 2);
        L.addChild(lbl('FIGHT CHALLENGE!', 34, GOLD, cx, cy + ph / 2 - 40), 3);
        var fr = spr(IMG + 'nh_fight_frame.png'), hd = head(v.from.head);
        if (hd) { hd.setPosition(cc.p(cx - pw / 2 + 80, cy + 30)); L.addChild(hd, 3); }
        if (fr) { fr.setPosition(cc.p(cx - pw / 2 + 80, cy + 30)); L.addChild(fr, 4); }
        L.addChild(lbl(v.from.name, 30, WHITE, cx - pw / 2 + 150, cy + 56, 0, 0.5), 3);
        L.addChild(lbl('Lv.' + v.from.lv + '   Power ' + v.from.power, 22, GREY, cx - pw / 2 + 150, cy + 16, 0, 0.5), 3);
        L.addChild(lbl('wants to fight you right now!', 22, WHITE, cx, cy - 40), 3);
        var t = lbl('', 22, RED, cx, cy - 72); L.addChild(t, 3);
        button(L, 'ACCEPT', cx - 110, cy - 125, 190, 62, 'nh_fight_btn_green.png', function () { send('fightAccept', { id: S.inviteId }); kill('invite'); }, 26);
        button(L, 'DECLINE', cx + 110, cy - 125, 190, 62, 'nh_fight_btn_red.png', function () { send('fightDecline', { id: S.inviteId }); kill('invite'); }, 26);
        L.schedule(function () { try { t.setString('Auto-decline in ' + Math.max(0, Math.ceil((S.inviteEnd - Date.now()) / 1000)) + 's'); } catch (e) { } }, 0.5);
        S.invite = L; attach(L);
    }

    // ═════════════════════════ LOBI GEDUNG ═════════════════════════
    function showLobby() {
        if (!S.lobby) { S.lobby = overlay(cc.c4b(0, 0, 0, 255)); }
        if (!attach(S.lobby)) { S.lobby = overlay(cc.c4b(0, 0, 0, 255)); attach(S.lobby); }
        renderLobby();
    }
    // ═════════════════════════ KONFIRMASI BAYAR GOLD (jatah harian habis) ═════════════════════════
    function showPayConfirm(v) {
        kill('pay');
        var sz = WS(), W = sz.width, H = sz.height, L = overlay(cc.c4b(0, 0, 0, 150)), cx = W / 2, cy = H / 2;
        var pw = Math.min(W - 40, 520), ph = 280;
        L.addChild(box(30, 18, 26, 245, pw, ph, cx - pw / 2, cy - ph / 2), 1);
        L.addChild(box(250, 200, 80, 255, pw, 4, cx - pw / 2, cy + ph / 2 - 4), 2);
        L.addChild(box(250, 200, 80, 255, pw, 4, cx - pw / 2, cy - ph / 2), 2);
        L.addChild(lbl('DAILY FIGHTS USED UP', 30, GOLD, cx, cy + ph / 2 - 40), 3);
        L.addChild(lbl(v.text || '', 20, GREY, cx, cy + 30), 3);
        L.addChild(lbl('Fight again for ' + v.pay.cost + ' gold?', 26, WHITE, cx, cy - 10), 3);
        button(L, 'PAY ' + v.pay.cost + ' GOLD', cx - 120, cy - 85, 210, 62, 'nh_fight_btn_green.png', function () {
            var r = {}; for (var k in v.pay.retry) r[k] = v.pay.retry[k]; r.confirm = 1;
            kill('pay'); send('fightChallenge', r);
        }, 22);
        button(L, 'CANCEL', cx + 120, cy - 85, 210, 62, 'nh_fight_btn_red.png', function () { kill('pay'); }, 24);
        S.pay = L; attach(L);
    }
    function renderLobby() {
        var L = S.lobby, d = S.data; if (!L || !d) return;
        clear(L);
        var sz = WS(), W = sz.width, H = sz.height, k = ux(), pad = 16 * k;
        bg(L, 'nh_fight_lobby_bg2.png', W, H);
        var lw = Math.min(W * 0.36, 360 * k), lx = pad, lcx = lx + lw / 2;
        var rx = lx + lw + pad, rw = W - rx - pad, rcx = rx + rw / 2;

        // ───────── kolom kiri: profil + tombol ─────────
        L.addChild(box(18, 12, 24, 215, lw, H - 2 * pad, lx, pad), 1);
        L.addChild(box(250, 200, 80, 255, lw, 3, lx, H - pad - 3), 2);
        var b = spr(IMG + 'nh_fight_building.png');
        if (b) { b.setScale(0.34 * k); b.setPosition(cc.p(lcx, H - pad - 78 * k)); L.addChild(b, 3); }
        L.addChild(lbl('FIGHT ARENA', 32 * k, GOLD, lcx, H - pad - 168 * k), 3);
        L.addChild(lbl('Week ends in ' + days(d.week.endsIn), 16 * k, GREY, lcx, H - pad - 196 * k), 3);
        var m = d.me;
        L.addChild(lbl('Win rate this week', 16 * k, GREY, lcx, H - pad - 232 * k), 3);
        L.addChild(lbl(m.rate + '%', 42 * k, GREEN, lcx, H - pad - 270 * k), 3);
        L.addChild(lbl(m.wins + 'W   ' + m.losses + 'L   ' + m.draws + 'D   (' + m.total + ' fights)', 18 * k, WHITE, lcx, H - pad - 304 * k), 3);
        L.addChild(lbl(m.rank ? 'Rank #' + m.rank : 'Unranked (min ' + d.cfg.minGames + ' fights)', 22 * k, GOLD, lcx, H - pad - 334 * k), 3);
        if (d.quota) L.addChild(lbl(d.quota.left > 0 ? 'Free fights today: ' + d.quota.left + '/' + d.quota.free : 'Free fights used  |  ' + d.quota.cost + ' gold per fight', 16 * k, d.quota.left > 0 ? GREEN : GOLD, lcx, H - pad - 360 * k), 3);
        var rule = (d.cfg.team || 3) + ' ninja each  |  turn-based  |  ' + (d.cfg.cd > 0 ? 'skill recovery ' + Math.round(d.cfg.cd / 1000) + 's' : 'no skill recovery');
        L.addChild(lbl(rule, 14 * k, GREY, lcx, H - pad - 384 * k), 3);
        // tombol (dari bawah ke atas)
        var bw = lw - 40 * k, bh = 50 * k, step = 58 * k, by = pad + 34 * k;
        button(L, 'CLOSE', lcx, by, bw, bh, 'nh_fight_btn_red.png', function () { kill('lobby'); kill('reward'); }, 22 * k); by += step;
        if (d.pending && d.pending.length) { button(L, 'CLAIM REWARD (RANK #' + d.pending[0].rank + ')', lcx, by, bw, bh, 'nh_fight_btn.png', function () { S.picks = []; S.rpage = 0; showReward(); }, 17 * k); by += step; }
        button(L, 'REFRESH', lcx, by, bw, bh, 'nh_fight_btn.png', function () { send('fightOpen'); }, 22 * k); by += step;
        button(L, 'QUICK MATCH', lcx, by, bw, bh, 'nh_fight_btn_green.png', function () { send('fightChallenge', { random: 1 }); }, 22 * k);

        // ───────── kolom kanan: daftar online / ranking ─────────
        L.addChild(box(18, 12, 24, 215, rw, H - 2 * pad, rx, pad), 1);
        L.addChild(box(250, 200, 80, 255, rw, 3, rx, H - pad - 3), 2);
        var tw = Math.min(rw / 2 - 20 * k, 230 * k), ty = H - pad - 38 * k;
        button(L, 'ONLINE (' + d.online.length + ')', rcx - tw / 2 - 8 * k, ty, tw, 46 * k, S.tab === 0 ? 'nh_fight_btn.png' : 'nh_fight_btn_red.png', function () { S.tab = 0; S.page = 0; renderLobby(); }, 20 * k);
        button(L, 'RANKING', rcx + tw / 2 + 8 * k, ty, tw, 46 * k, S.tab === 1 ? 'nh_fight_btn.png' : 'nh_fight_btn_red.png', function () { S.tab = 1; S.page = 0; renderLobby(); }, 20 * k);
        var top = ty - 36 * k, rowH = 62 * k, bottom = pad + 62 * k;
        var perPage = Math.max(3, Math.floor((top - bottom) / rowH));
        var list = S.tab === 0 ? d.online : d.top, pages = Math.max(1, Math.ceil(list.length / perPage));
        if (S.page >= pages) S.page = pages - 1;
        var ix = rx + 14 * k, iw = rw - 28 * k;
        if (!list.length) L.addChild(lbl(S.tab === 0 ? 'No other ninja is online right now.' : 'No ranked ninja yet this week.', 20 * k, GREY, rcx, top - 60 * k), 3);
        for (var i = 0; i < perPage; i++) {
            var it = list[S.page * perPage + i]; if (!it) break;
            var y = top - i * rowH - rowH / 2;
            L.addChild(box(0, 0, 0, i % 2 ? 90 : 140, iw, rowH - 6 * k, ix, y - (rowH - 6 * k) / 2), 2);
            if (S.tab === 0) {
                L.addChild(lbl(it.name, 24 * k, WHITE, ix + 14 * k, y + 11 * k, 0, 0.5), 3);
                L.addChild(lbl('Lv.' + it.lv + (it.busy ? '   (busy)' : ''), 17 * k, it.busy ? RED : GREY, ix + 14 * k, y - 14 * k, 0, 0.5), 3);
                (function (p) { button(L, 'FIGHT', ix + iw - 80 * k, y, 140 * k, 44 * k, 'nh_fight_btn_red.png', function () { send('fightChallenge', { pid: p.pid }); }, 20 * k, !p.busy); })(it);
            } else {
                L.addChild(lbl('#' + it.r, 28 * k, it.r <= 3 ? GOLD : WHITE, ix + 14 * k, y, 0, 0.5), 3);
                L.addChild(lbl(it.name, 22 * k, WHITE, ix + 90 * k, y + 11 * k, 0, 0.5), 3);
                L.addChild(lbl(it.wins + 'W ' + it.losses + 'L ' + it.draws + 'D', 16 * k, GREY, ix + 90 * k, y - 14 * k, 0, 0.5), 3);
                L.addChild(lbl(it.rate + '%', 28 * k, GREEN, ix + iw - 16 * k, y, 1, 0.5), 3);
            }
        }
        if (pages > 1) {
            var py = pad + 32 * k;
            button(L, '<', rcx - 110 * k, py, 80 * k, 42 * k, 'nh_fight_btn.png', function () { S.page = (S.page + pages - 1) % pages; renderLobby(); }, 24 * k);
            L.addChild(lbl((S.page + 1) + '/' + pages, 20 * k, WHITE, rcx, py), 3);
            button(L, '>', rcx + 110 * k, py, 80 * k, 42 * k, 'nh_fight_btn.png', function () { S.page = (S.page + 1) % pages; renderLobby(); }, 24 * k);
        }
    }

    // ═════════════════════════ PILIH HADIAH (rank 1-3, pilih 2) ═════════════════════════
    function showReward() {
        if (!S.data || !S.data.rewards) return;
        if (!S.reward) S.reward = overlay(cc.c4b(0, 0, 0, 215));
        if (!attach(S.reward)) { S.reward = overlay(cc.c4b(0, 0, 0, 215)); attach(S.reward); }
        renderReward();
    }
    function renderReward() {
        var L = S.reward, d = S.data; if (!L || !d || !d.rewards) return;
        clear(L);
        var sz = WS(), W = sz.width, H = sz.height, cx = W / 2, need = d.cfg.picks, ent = d.pending[0];
        var info = d.rewardInfo || { gold: 0, qname: '' };
        L.addChild(lbl('CHOOSE YOUR ' + info.qname + ' NINJA', 36, GOLD, cx, H - 52), 3);
        L.addChild(lbl('Rank #' + ent.rank + ' (week ' + ent.week + ')   -   ' + (info.gold > 0 ? '+' + String(info.gold).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' Gold included   -   ' : '') + 'selected ' + S.picks.length + '/' + need, 22, WHITE, cx, H - 92), 3);
        var cols = 2, cw = (W - 60) / cols, ch = 76, rows = Math.max(3, Math.floor((H - 300) / ch)), per = cols * rows;
        var list = d.rewards, pages = Math.max(1, Math.ceil(list.length / per));
        if (S.rpage >= pages) S.rpage = pages - 1;
        for (var i = 0; i < per; i++) {
            var it = list[S.rpage * per + i]; if (!it) break;
            var x = 30 + (i % cols) * cw, y = H - 130 - Math.floor(i / cols) * ch - ch;
            var on = S.picks.indexOf(it.k) >= 0;
            L.addChild(box(on ? 60 : 30, on ? 150 : 24, on ? 70 : 34, on ? 235 : 215, cw - 10, ch - 8, x, y), 2);
            L.addChild(box(250, 200, 80, on ? 255 : 90, cw - 10, 3, x, y), 3);
            var hd = head(it.head);
            if (hd) { hd.setScale(0.8); hd.setPosition(cc.p(x + 40, y + (ch - 8) / 2)); L.addChild(hd, 3); }
            else L.addChild(lbl('$', 34, GOLD, x + 40, y + (ch - 8) / 2), 3);
            L.addChild(lbl(it.name, 22, on ? GREEN : WHITE, x + 84, y + (ch - 8) / 2, 0, 0.5), 3);
            (function (k, bx, by, bw, bh) {
                L.btns.push({ x: bx, y: by, w: bw, h: bh, fn: function () {
                    var p = S.picks.indexOf(k);
                    if (p >= 0) S.picks.splice(p, 1); else { if (S.picks.length >= need) S.picks.shift(); S.picks.push(k); }
                    renderReward();
                } });
            })(it.k, x, y, cw - 10, ch - 8);
        }
        var by = 200;
        if (pages > 1) {
            button(L, '<', cx - 120, by, 80, 46, 'nh_fight_btn.png', function () { S.rpage = (S.rpage + pages - 1) % pages; renderReward(); }, 24);
            L.addChild(lbl((S.rpage + 1) + '/' + pages, 22, WHITE, cx, by), 3);
            button(L, '>', cx + 120, by, 80, 46, 'nh_fight_btn.png', function () { S.rpage = (S.rpage + 1) % pages; renderReward(); }, 24);
        }
        button(L, 'CONFIRM', cx - 120, 100, 210, 62, 'nh_fight_btn_green.png', function () { send('fightClaim', { id: ent.id, picks: S.picks.slice() }); }, 26, S.picks.length === need);
        button(L, 'BACK', cx + 120, 100, 210, 62, 'nh_fight_btn_red.png', function () { kill('reward'); }, 26);
    }

    // ── ukuran layar: semua ukuran UI duel dikali ini (desain acuan 960x640, layar lain menyesuaikan) ──
    function ux() { var z = WS(); return Math.max(0.6, Math.min(z.width / 960, z.height / 640)); }

    // ── ninja beranimasi (armature) — sama seperti yang dipakai arena / battle ──────────────
    var NIN_SCALE = 1.0;      // DIUBAH dari 1.4: skala PVE. Animasi jurus (mis. muyebaiya) menggeser bone ±570 unit = jarak ke lawan; 1.4x membuat karakter melewati lawan
    // z-order seperti PVE: efek z = Z_EFF + Effect.stages (stages 5 = latar DI BAWAH ninja, 25 = di atas), ninja diam z=Z_ROLE, penyerang naik ke Z_ATK saat menyerang
    var Z_EFF = 10, Z_ROLE = 20, Z_ATK = 30, Z_FLOAT = 60;
    var NIN_FACE_RIGHT = 1;   // 1 = armature bawaan menghadap kanan; ganti -1 kalau ninja terbalik arah
    function makeNinja(u, face, side) {
        try {
            var id = Number(u.roleId);
            if (!id || typeof ArmatureTools === 'undefined' || typeof ArmatureLoad === 'undefined' || typeof Config === 'undefined') return null;
            var cfg = Config.getInstance(), R = cfg.roleObject && cfg.roleObject[id];
            if (!R) return null;
            var cos = Number(u.costume) || 0, cd = cos > 0 && cfg.costmueObject ? cfg.costmueObject[cos] : null;
            var AL = ArmatureLoad.getInstance(), arm = null;
            // data armature HARUS terdaftar sebelum ccs.Armature.create (kalau tidak: SIGSEGV native)
            AL.addExportJson('mainAction'); AL.addXML('weapon'); AL.addXML(R.xmlfile);
            if (cd && cd.xmlfile) { try { AL.addXML(cd.xmlfile); arm = ArmatureTools.roleArmature(id, cos); } catch (e) { arm = null; } }
            if (!arm) arm = ArmatureTools.roleArmatureLoad(id);
            if (!arm) return null;
            var sc = NIN_SCALE * ux();
            arm.setScaleX(sc * face * NIN_FACE_RIGHT); arm.setScaleY(sc);
            try {   // animasi sekali-putar SELESAI -> tandai done (dipakai pemutar jurus: tahap berikutnya baru jalan setelah ini)
                arm.getAnimation().setMovementEventCallFunc(function (a, t, mid) {
                    var Fx = S.F, an = Fx && Fx.anim && Fx.anim[side];
                    if (an && (t === 1 || t === 2) && String(mid) === an.cur) { an.done = true; if (an.until) an.until = 1; }
                }, arm);
            } catch (e) { }
            try {   // frame event animasi (effectAHit, effectB, sceneEffect, hpHurtB, rock, sceneBlack_N, soundWav_*) -> diteruskan ke pemutar jurus penyerang
                arm.getAnimation().setFrameEventCallFunc(function (bone, evt) {
                    var Fx = S.F, h = Fx && Fx.fe && Fx.fe[side];
                    if (h) h(String(evt));
                }, arm);
            } catch (e) { }
            return arm;
        } catch (e) { return null; }
    }
    function playAnim(side, name, loop, ms, force) {
        var F = S.F; if (!F || !F.ui || !F.ui.nin || !F.ui.nin[side]) return;
        var a = F.anim[side], now = Date.now();
        if (!force && a.lock > now) return;                       // sedang memainkan jurus: jangan diinterupsi
        if (loop && a.cur === name && !a.until) return;
        try { F.ui.nin[side].getAnimation().play(name, -1, -1, loop ? 1 : 0); } catch (e) { return; }
        a.cur = name; a.until = loop ? 0 : now + (ms || 600); a.done = false;
    }
    function lockAnim(side, ms) { var a = S.F.anim[side]; a.lock = a.hold = Date.now() + (ms || 120000); }
    function unlockAnim(side) { var a = S.F.anim[side]; a.lock = a.hold = 0; a.until = 0; a.cur = ''; a.queue = []; }
    function later(ms, fn) { var F = S.F; if (F) F.todo.push({ at: Date.now() + sd(ms), fn: fn }); }
    // tunggu sampai cond() benar (tapi minimal minMs dan paling lama maxMs), lalu cb()
    function waitUntil(F, cond, minMs, maxMs, cb) {
        var t0 = Date.now(); minMs = sd(minMs); maxMs = sd(maxMs);
        (function poll() {
            if (S.F !== F) return;
            var el = Date.now() - t0, ok = false;
            try { ok = cond(); } catch (e) { ok = true; }
            if (el >= maxMs || (el >= minMs && ok)) { cb(); return; }
            F.todo.push({ at: Date.now() + 50, fn: poll });
        }());
    }
    // putar satu animasi ninja sekali sampai SELESAI (callback armature), bukan memotong pakai timer
    function stageWait(side, name, minMs, maxMs, next) {
        var F = S.F, a = F.anim[side];
        if (name) playAnim(side, name, false, maxMs + 500, true);
        waitUntil(F, function () { return !name || a.done; }, minMs, maxMs, next);
    }

    // lawan disembunyikan selama efek layar penuh (cutscene) aktif, seperti PVE; ditampilkan lagi saat efek habis
    function setFoeVisible(v) {
        var F = S.F; if (!F || !F.ui || F.atkSide == null) return;
        try { var h = F.ui.heads[1 - F.atkSide]; if (h) h.setVisible(!!v); } catch (e) { }
    }
    function setRoleZ(side, z) { var F = S.F, L = S.fight; try { if (F && F.ui && F.ui.heads[side] && L) L.reorderChild(F.ui.heads[side], z); } catch (e) { } }
    // efek visual (armature efek dari tabel Effect) di atas ninja
    // o (opsional): { dx, dy } offset dari tabel Skill (relatif arah hadap), scene:true = efek layar penuh di tengah arena,
    //               to:{x,y}+dur = efek meluncur ke lawan (effectARun)
    function spawnEffect(side, id, o) {
        var F = S.F, L = S.fight; if (!F || !L) return;
        o = o || {};
        if (o.scene && FIGHT_SCENE === 'off') return;                // efek layar penuh dimatikan
        if (o.scene && FIGHT_SCENE !== 'full') F.sceneRm.splice(0).forEach(function (r) { r(); });   // mode 'dim': cukup 1 efek layar penuh aktif. Mode 'full' (seperti PVE): tahap sebelumnya dibiarkan selesai sendiri
        try {
            var cfg = Config.getInstance(), ef = cfg.effectObject && cfg.effectObject[Number(id)];
            if (!ef || !ef.exportJson) return;
            ArmatureLoad.getInstance().addExportJson(ef.exportJson);
            var mgr = ccs.ArmatureDataManager.getInstance();           // wajib terdaftar dulu: kalau tidak SIGSEGV native
            if (typeof mgr.getArmatureData === 'function' && !mgr.getArmatureData(ef.exportJson)) return;
            var arm = ccs.Armature.create(ef.exportJson); if (!arm) return;
            var p = F.ui.pos[side], face = side === F.me ? 1 : -1, sz = WS(), k = ux();
            // 582 dari 592 efek bertanda noScaleX=1 = efek digambar menghadap KANAN. Seperti arena bawaan (SceneEffectContainer),
            // efek ini harus DIBALIK kalau penyerang ada di sisi kanan layar (= layar lawan), kalau tidak efek menjauhi target.
            // Dipakai arah hadap PENYERANG (bukan sisi pemilik efek) supaya efek di target ikut terbalik juga: layar lawan = cermin layar penyerang.
            var af = (F.atkFace === 1 || F.atkFace === -1) ? F.atkFace : face, nsx = Number(ef.noScaleX) === 1;
            var flip = nsx ? af : face;
            var sc = (o.scene ? 1.3 : 1.2) * k;
            arm.setScaleX(flip * sc * NIN_FACE_RIGHT); arm.setScaleY(sc);
            var px = o.scene ? sz.width / 2 : p.x, py = o.scene ? sz.height * 0.40 : p.y - 40 * k;
            arm.setPosition(cc.p(px + (o.dx || 0) * k * (o.scene ? (nsx ? af : 1) : face), py + (o.dy || 0) * k));
            var full = o.scene && FIGHT_SCENE === 'full';
            var stg = Number(ef.stages) > 0 ? Number(ef.stages) : 25, effZ = Z_EFF + stg;   // = reorderChild(efek, stages) di PVE
            L.addChild(arm, (o.scene && !full) ? SCENE_Z : effZ);
            if (o.scene && !full) {                                    // mode 'dim': semi-transparan supaya arena & ninja tetap terlihat
                try { arm.setCascadeOpacityEnabled(true); } catch (e) { }
                try { arm.setOpacity(SCENE_OPACITY); } catch (e) { }
            }
            var counted = !o.scene;                                    // efek biasa ditunggu lewat F.fx
            var scn = !!o.scene && FIGHT_SCENE === 'full';             // efek layar penuh (mode full) ditunggu lewat F.scn supaya TIDAK terpotong
            if (counted) F.fx++;
            if (scn) { F.scn = (F.scn || 0) + 1; setFoeVisible(false); }
            var gone = false;
            var rm = function () { if (gone) return; gone = true; if (counted) F.fx = Math.max(0, F.fx - 1); if (scn) { F.scn = Math.max(0, (F.scn || 0) - 1); if (F.scn <= 0) setFoeVisible(true); } try { if (arm.getParent()) arm.removeFromParent(true); } catch (e) { } };
            arm.getAnimation().play(ef.timeline || ef.exportJson, -1, -1, 0);
            if (o.to) { try { arm.runAction(cc.MoveTo.create((o.dur || 400) / 1000, cc.p(o.to.x, o.to.y))); } catch (e) { } }
            if (o.scene && !scn) F.sceneRm.push(rm);                  // mode 'dim': dipaksa hilang begitu jurus selesai
            F.todo.push({ at: Date.now() + sd(o.scene ? (FIGHT_SCENE === 'full' ? SCENE_FULL_MAX_MS : SCENE_MAX_MS) : EFFECT_MAX_MS), fn: rm });   // pengaman saja: efek hilang sendiri saat selesai
            try { arm.getAnimation().setMovementEventCallFunc(function (a, t) { if (t === 1 || t === 2) rm(); }, arm); } catch (e) { }
        } catch (e) { }
    }

    // ═════════════════════════ PEMUTAR JURUS (animasi PENUH, urutan sama dengan PVE) ═════════════════════════
    // persiapan -> lari ke lawan -> tahap serang -> efek selesai -> kembali. TIAP TAHAP MENUNGGU animasinya benar-benar
    // selesai (bukan timer tetap), jadi jurus panjang tidak terpotong. Data per-tahap berasal dari tabel Skill lewat server (vis.v2).
    function fxAt(arr, i) { return (arr && arr[i]) || []; }
    function offAt(arr, i, k) { var o = arr && arr[i]; return (o && o[k] != null) ? o[k] : (o && o.length === 1 ? o[0] : 0); }
    function visOf(sk) {                                           // skill lama tanpa v2 dibuat setara v2 sederhana
        var vis = (sk && sk.vis) || {};
        if (vis.v2) return vis.v2;
        return { rd: [], erd: [], run: '', erun: [], dist: 0, a: [(vis.a && vis.a[0]) || 'shifaAHit'], b: vis.b || [], ea: [vis.ea || []], eax: [], eay: [], eb: [vis.eb || []], ebx: [], eby: [], sc: [], scx: [], scy: [], hb: [], ha: [] };
    }
    var FE_SEEN = false;   // true begitu klien pernah menerima frame event dari animasi ninja (event jalan -> mode PVE penuh)
    function runCast(job, fin) {
        if (!job.skill) { runFxOnly(job, fin); return; }
        var F = S.F, e = job.skill, side = e.s, foe = 1 - side, face = side === F.me ? 1 : -1, k = ux();
        var uIdx = e.u != null ? e.u : F.show[side], tIdx = e.tu != null ? e.tu : F.show[foe];
        var sk = F.f[side].units[uIdx] && F.f[side].units[uIdx].skills[e.idx], V = visOf(sk);
        F.round++;
        F.atkSide = side; F.atkFace = face;                                          // arah hadap PENYERANG (1 = kiri layar, -1 = kanan layar): dipakai spawnEffect untuk memutar semua efek jurus ini
        F.fe = F.fe || [null, null];
        // ── Seperti PVE: efek/damage/goyang/gelap dipicu FRAME EVENT di dalam animasi ninja (effectAHit, effectB, sceneEffect, hpHurtB, rock, sceneBlack_N, soundWav_*).
        //    Tiap tipe event mengambil slot BERIKUTNYA dari tabel Skill (counter per jurus, lintas tahap) = effectAHitLeng/sceneEffectLeng/... di game asli.
        var ix = { ea: 0, eb: 0, sc: 0, hb: 0, ha: 0, erd: 0 };
        var nR = (V.rd || []).length, nS = Math.max((V.a || []).length, 1);
        var STAGE_MAX = 8000, RUN = V.run ? 420 : 0, BACK = V.run ? 320 : 0;
        var hb = V.hb || [], hurtSum = 0, hitSlot = -1, q;
        for (q = 0; q < hb.length; q++) { hurtSum += (hb[q] || 0); if (hb[q] > 0) hitSlot = q; }
        var attacks = e.v > 0 || e.dodge, noData = hurtSum <= 0;
        var dealt = 0, missShown = false, castDone = false, evSeen = false, curStage = 0;
        var p0 = F.ui.pos[side], p1 = F.ui.pos[foe], steps = [];
        function alive() { return S.F === F; }
        var lastB = (V.b || []).filter(Boolean).pop() || '';

        function evER() { var i = ix.erd++; fxAt(V.erd, i).forEach(function (id) { spawnEffect(side, id); }); }
        function evEA() { var i = ix.ea++; fxAt(V.ea, i).forEach(function (id, kk) { spawnEffect(side, id, { dx: offAt(V.eax, i, kk), dy: offAt(V.eay, i, kk) }); }); }
        function evEB() { var i = ix.eb++; fxAt(V.eb, i).forEach(function (id, kk) { spawnEffect(foe, id, { dx: offAt(V.ebx, i, kk), dy: offAt(V.eby, i, kk) }); }); }
        function evSC() { var i = ix.sc++; fxAt(V.sc, i).forEach(function (id, kk) { spawnEffect(side, id, { scene: true, dx: offAt(V.scx, i, kk), dy: offAt(V.scy, i, kk) }); }); }
        function evHB() {                                                           // damage masuk TEPAT di frame hpHurtB, bukan timer tetap
            var i = ix.hb++;
            if (!attacks) return;
            var pct = noData ? (i === 0 ? 100 : 0) : (hb[i] || 0);
            if (pct <= 0) return;
            if (e.dodge) { if (!missShown) { missShown = true; playAnim(foe, 'shanbi', false, 500, true); spawnNum(foe, 'MISS', { miss: true, fbCol: GREY, fbSize: 30 }); } return; }
            var last = noData || i === hitSlot;
            var part = last ? Math.max(0, e.v - dealt) : Math.round(e.v * pct / hurtSum);
            dealt += part; F.shake[foe] = Date.now() + 250;
            F.sh[foe][tIdx] = Math.max(0, F.sh[foe][tIdx] - part);
            playAnim(foe, (V.b || [])[curStage] || lastB || 'beiji', false, 900, true);   // lawan bereaksi (timelineB tahap ini) TEPAT saat kena hit, bukan saat jurus baru mulai
            spawnNum(foe, '-' + part, { crit: !!(e.crit && last), big: last, fbText: (e.crit && last ? 'CRIT ' : '') + part, fbCol: e.crit ? c3(255, 210, 60) : c3(255, 150, 80), fbSize: last ? 44 : 32 });
        }
        function blackClose() { try { if (F.blk && F.blk.getParent()) F.blk.removeFromParent(true); } catch (x) { } F.blk = null; }
        function blackOpen(n) {                                                      // sceneBlack_N: layar digelapkan (N = opasitas 0-255), di bawah efek & ninja
            try { blackClose(); var sz = WS(), L = S.fight; if (!L) return; F.blk = box(0, 0, 0, Math.max(0, Math.min(180, n || 0)), sz.width, sz.height, 0, 0); L.addChild(F.blk, 12); } catch (x) { }
        }
        function rock() {                                                            // rock: layar bergoyang singkat (rockPlayer di PVE)
            try {
                var L = S.fight; if (!L) return;
                var o = F.rockO || (F.rockO = L.getPosition()), seq = [[-9, 6], [9, -6], [-7, 5], [6, -4], [-4, 3], [3, -2]];
                seq.forEach(function (d, i) { later(i * 35, function () { try { L.setPosition(cc.p(o.x + d[0] * k, o.y + d[1] * k)); } catch (x) { } }); });
                later(seq.length * 35, function () { try { L.setPosition(cc.p(o.x, o.y)); } catch (x) { } });
            } catch (x) { }
        }
        function onEv(evt) {
            if (!alive() || castDone) return;
            evSeen = FE_SEEN = true;
            try {
                if (evt === 'effectAHit') evEA();
                else if (evt === 'effectB') evEB();
                else if (evt === 'sceneEffect') evSC();
                else if (evt === 'hpHurtB') evHB();
                else if (evt === 'hpHurtA') ix.ha++;
                else if (evt === 'effectAReady') evER();
                else if (evt === 'rock') rock();
                else if (evt === 'sceneBlackClose') blackClose();
                else if (evt.indexOf('sceneBlack_') === 0) blackOpen(parseInt(evt.substr(11), 10));
                else if (evt.indexOf('soundWav_') === 0) { try { AudioEngine.getInstance().gameEffectSound(evt); } catch (x) { } }
            } catch (x) { }
        }
        F.fe[side] = onEv;
        // jalur cadangan: kalau frame event TIDAK pernah datang (callback tak didukung), jatuhkan semua slot sekaligus seperti versi lama supaya efek & damage tetap muncul
        function drain() {
            var g = 0;
            while (ix.erd < (V.erd || []).length && g++ < 40) evER();
            while (ix.ea < (V.ea || []).length && g++ < 80) evEA();
            while (ix.sc < (V.sc || []).length && g++ < 120) evSC();
            while (ix.eb < (V.eb || []).length && g++ < 160) evEB();
        }
        // damage yang belum sempat masuk lewat event (animasi tanpa hpHurtB) dibereskan di sini supaya HP tetap benar
        function settle() {
            if (!attacks) return;
            if (e.dodge) { if (!missShown) { missShown = true; playAnim(foe, 'shanbi', false, 500, true); spawnNum(foe, 'MISS', { miss: true, fbCol: GREY, fbSize: 30 }); } return; }
            if (dealt < e.v) {
                var part = e.v - dealt; dealt = e.v; F.shake[foe] = Date.now() + 250;
                F.sh[foe][tIdx] = Math.max(0, F.sh[foe][tIdx] - part);
                if (!F.anim[foe].lock) playAnim(foe, lastB || 'beiji', false, 900, true);
                spawnNum(foe, '-' + part, { crit: !!e.crit, big: true, fbText: (e.crit ? 'CRIT ' : '') + part, fbCol: e.crit ? c3(255, 210, 60) : c3(255, 150, 80), fbSize: 44 });
            }
        }
        lockAnim(side);
        setRoleZ(side, Z_ATK); setRoleZ(foe, Z_ROLE);                // penyerang di atas lawan (PVE: 2 x roleZ)
        spawnFloat(side, (sk && sk.name) || '', GOLD, 26);
        if (!FE_SEEN) later(900, function () { if (alive() && !castDone && !FE_SEEN && !evSeen) { drain(); } });   // probe sekali: event tak datang -> mode cadangan

        // 1) persiapan (efek persiapan lewat event effectAReady; sisanya dijatuhkan setelah animasinya selesai)
        if (!(V.rd || []).some(Boolean)) steps.push(function (next) { while (ix.erd < (V.erd || []).length) evER(); next(); });
        for (var i = 0; i < nR; i++) (function (i) {
            steps.push(function (next) { stageWait(side, (V.rd || [])[i], 200, STAGE_MAX, next); });
        }(i));
        if (nR > 0) steps.push(function (next) { if (FE_SEEN === false || ix.erd === 0) { while (ix.erd < (V.erd || []).length) evER(); } next(); });
        // 2) lari ke arah lawan
        if (V.run) steps.push(function (next) {
            playAnim(side, V.run, true, 0, true);
            F.mv[side] = { from: 0, to: (p1.x - p0.x) - face * 150 * k, t0: Date.now(), dur: sd(RUN) };
            (V.erun || []).forEach(function (id) { spawnEffect(side, id, { to: { x: p1.x - face * 150 * k, y: p0.y - 40 * k }, dur: RUN }); });
            later(RUN, next);
        });
        // 3) tahap serang: animasi penyerang jalan penuh; efek, scene, goyang, gelap & damage keluar dari frame event-nya
        for (var j = 0; j < nS; j++) (function (j) {
            steps.push(function (next) {
                curStage = j;
                var nm = (V.a || [])[j] || (j === 0 && !(V.a || []).some(Boolean) ? 'shifaAHit' : '');
                stageWait(side, nm, nm ? 250 : 300, STAGE_MAX, function () {
                    waitUntil(F, function () { return (F.scn || 0) <= 0; }, 0, SCENE_FULL_MAX_MS, next);   // cutscene tahap ini diputar sampai habis (seperti PVE)
                });
            });
        }(j));
        // 4) bereskan sisa (damage yang belum masuk), lalu tunggu semua efek selesai dan kembali ke posisi semula
        steps.push(function (next) {
            if (!FE_SEEN && !evSeen) drain();                                       // event tidak pernah datang: efek tetap dikeluarkan
            settle();
            castDone = true; F.fe[side] = null; blackClose();
            waitUntil(F, function () { return F.fx <= 0; }, 0, 1200, function () {
                waitUntil(F, function () { return (F.scn || 0) <= 0; }, 0, SCENE_FULL_MAX_MS, function () {
                    F.sceneRm.splice(0).forEach(function (r) { r(); });   // mode 'dim': layar hitam tidak boleh bertahan setelah jurus selesai
                    F.scn = 0; setFoeVisible(true);                       // pengaman: lawan pasti tampil lagi
                    try { if (F.rockO && S.fight) S.fight.setPosition(cc.p(F.rockO.x, F.rockO.y)); } catch (x) { }
                    next();
                });
            });
        });
        if (V.run) steps.push(function (next) {
            playAnim(side, V.run, true, 0, true);
            F.mv[side] = { from: (p1.x - p0.x) - face * 150 * k, to: 0, t0: Date.now(), dur: sd(BACK) };
            later(BACK, next);
        });
        // 5) hasil tambahan: heal / stun / buff / skip giliran
        steps.push(function (next) {
            showFxEvents(job.ev || []);
            unlockAnim(side);
            setRoleZ(side, Z_ROLE);
            next();
        });
        // 6) ninja KO -> animasi jatuh, lalu ninja berikutnya masuk
        var downs = collectDowns(job.ev || []);
        if (downs.length) steps.push(function (next) { runDowns(downs, 0, next); });

        (function go(n) {
            if (!alive()) return;
            if (n >= steps.length) { castDone = true; try { F.fe[side] = null; } catch (x) { } fin(); return; }
            var done = false;
            try { steps[n](function () { if (done) return; done = true; go(n + 1); }); } catch (err) { if (!done) { done = true; go(n + 1); } }
        }(0));
    }

    // ── efek skill di arena: heal / stun / buff / DOT / reflect / skip ────────────────────────────────
    function fxLabel(x) {
        var v = Number(x.v), blue = c3(120, 200, 255), purple = c3(190, 110, 255);
        if (x.k === 'att') return v < 1 ? ['ATK DOWN', RED] : ['ATK UP', blue];
        if (x.k === 'def') return v < 1 ? ['DEF DOWN', RED] : ['DEF UP', blue];
        if (x.k === 'reflect') return ['REFLECT', blue];
        if (x.k === 'hp' || x.k === 'hpcur') return v > 0 ? ['POISON', purple] : ['REGEN', GREEN];
        return ['GUARD', blue];
    }
    function showFxEvents(evs) {
        var F = S.F; if (!F) return;
        for (var n = 0; n < evs.length; n++) {
            var x = evs[n], ui = (x.u != null ? x.u : F.show[x.s]);
            if (x.t === 'heal') { F.sh[x.s][ui] = Math.min(F.U[x.s][ui].max, F.sh[x.s][ui] + x.v); spawnNum(x.s, '+' + x.v, { big: true, fbCol: GREEN, fbSize: 36 }); }
            else if (x.t === 'dot') {                                  // DOT berdetak (v > 0) / regen (v < 0)
                if (x.v > 0) { F.sh[x.s][ui] = Math.max(0, F.sh[x.s][ui] - x.v); F.shake[x.s] = Date.now() + 200; spawnNum(x.s, '-' + x.v, { fbCol: c3(190, 110, 255), fbSize: 32 }); }
                else { F.sh[x.s][ui] = Math.min(F.U[x.s][ui].max, F.sh[x.s][ui] - x.v); spawnNum(x.s, '+' + (-x.v), { fbCol: GREEN, fbSize: 32 }); }
            }
            else if (x.t === 'reflect') {                              // damage pantulan: x.s = penyerang yang kena
                F.sh[x.s][ui] = Math.max(0, F.sh[x.s][ui] - x.v); F.shake[x.s] = Date.now() + 250;
                spawnFloat(x.s, 'REFLECT', c3(120, 200, 255), 26); spawnNum(x.s, '-' + x.v, { fbCol: c3(120, 200, 255), fbSize: 32 });
            }
            else if (x.t === 'stun') spawnFloat(x.s, 'STUN', RED, 36);
            else if (x.t === 'buff') { var lb = fxLabel(x); spawnFloat(x.s, lb[0], lb[1], 28); }
            else if (x.t === 'skip') (function (x) { later(900, function () { if (S.F && !S.F.ended) { spawnFloat(x.s, 'SKIP TURN', RED, 30); playAnim(x.s, 'zhengzha', false, 1800, true); } }); }(x));
        }
    }
    // satu atau lebih ninja KO dalam satu pekerjaan animasi (serangan + pantulan + DOT): putar berurutan
    function collectDowns(evs) {
        var out = [];
        for (var i = 0; i < evs.length; i++) if (evs[i].t === 'down') {
            var sw = (evs[i + 1] && evs[i + 1].t === 'swap' && evs[i + 1].s === evs[i].s) ? evs[i + 1] : null;
            out.push({ down: evs[i], swap: sw });
        }
        return out;
    }
    function runDowns(list, i, done) {
        if (i >= list.length) { done(); return; }
        runDown(list[i].down, list[i].swap, function () { runDowns(list, i + 1, done); });
    }
    // pekerjaan tanpa jurus (mis. DOT berdetak setelah giliran dilewati): tampilkan efek + KO saja
    function runFxOnly(job, fin) {
        var F = S.F; if (!F) { fin(); return; }
        showFxEvents(job.ev || []);
        runDowns(collectDowns(job.ev || []), 0, function () { later(350, fin); });
    }
    // label status berdurasi (DOT / reflect / def) di bawah tiap ninja
    function stText(list) {
        var out = [];
        for (var i = 0; i < (list || []).length; i++) {
            var t = list[i], k = t[0], v = Number(t[3]), nm = null;
            if (k === 'hp' || k === 'hpcur') nm = v > 0 ? 'POISON' : 'REGEN';
            else if (k === 'reflect') nm = 'REFLECT';
            else if (k === 'def') nm = v < 1 ? 'DEF-' : 'DEF+';
            if (nm) out.push(nm + ' x' + t[1]);
        }
        return out.join('  ');
    }

    // ninja jatuh (animasi penuh) -> hilang -> ninja berikutnya masuk dari sisi layar (kalau masih ada)
    function runDown(down, swap, next) {
        var F = S.F, s = down.s, k = ux();
        lockAnim(s);
        F.sh[s][down.u] = 0;
        spawnFloat(s, 'K.O.', RED, 40);
        stageWait(s, 'siwang', 600, 2500, function () {
            if (S.F !== F) return;
            F.visDead[s][down.u] = true;
            if (!swap) { next(); return; }                         // ninja terakhir: tetap tergeletak sampai layar hasil
            later(250, function () {
                if (S.F !== F) return;
                swapIn(s, swap.u);
                F.mv[s] = { from: (s === F.me ? -1 : 1) * Math.max(220 * k, WS().width * 0.26), to: 0, t0: Date.now(), dur: sd(450) };
                later(550, next);
            });
        });
    }
    function swapIn(s, idx) {
        var F = S.F;
        F.show[s] = idx; F.dhp[s] = F.sh[s][idx];
        buildHolder(s, idx);
        unlockAnim(s); playAnim(s, 'daiji', true);
        refreshNames(s);
        if (s === F.me) buildSkillButtons();
        var uu = F.f[s].units[idx];
        spawnFloat(s, uu.roleName || ('Ninja ' + (idx + 1)), GOLD, 26);
    }

    // ═════════════════════════ LAYAR DUEL ═════════════════════════
    function startFight(v) {
        kill('lobby'); kill('invite'); kill('reward'); kill('fight'); kill('pay');
        var f = v.f, U = [], sh = [], show = [], vd = [], s;
        for (s = 0; s < 2; s++) {
            if (!f[s].units) f[s].units = [{ roleId: f[s].roleId, costume: f[s].costume, head: f[s].head, roleName: f[s].roleName, power: f[s].power, hp: f[s].hp, max: f[s].max, skills: f[s].skills }];
            U[s] = f[s].units.map(function (u) { return { hp: u.hp, max: u.max }; });
            sh[s] = f[s].units.map(function (u) { return u.hp; });
            vd[s] = f[s].units.map(function () { return false; });
            show[s] = f[s].cur || 0;
        }
        S.F = { id: v.id, me: v.me, cd: Number(v.cd) || 0, f: f, U: U, sh: sh, show: show, visDead: vd, dhp: [sh[0][show[0]], sh[1][show[1]]],
            cds: [[], []], skip: [0, 0], auto: [0, 0], recv: Date.now(), floats: [], shake: [0, 0], lunge: [0, 0], ended: false, leaveAt: 0,
            anim: [{ cur: '', until: 0, queue: [], lock: 0, hold: 0, done: false }, { cur: '', until: 0, queue: [], lock: 0, hold: 0, done: false }],
            todo: [], mv: [null, null], turn: v.turn, rd: v.rd || 0, tl: v.tl || 0, hold: v.hold ? 1 : 0,
            q: [], busy: false, fx: 0, round: 0, sceneRm: [], fe: [null, null] };
        buildFight();
    }
    function refreshNames(s) {
        var F = S.F; if (!F || !F.ui || !F.ui.ninName) return;
        var u = F.f[s].units[F.show[s]];
        try { F.ui.ninName[s].setString((u.roleName || '') + '   (' + (F.show[s] + 1) + '/' + F.f[s].units.length + ')'); } catch (e) { }
    }
    // gambar ninja yang sedang tampil di sisi s (armature + bayangan; cadangan: ikon kepala)
    function buildHolder(s, idx) {
        var F = S.F, holder = F.ui.heads[s], u = F.f[s].units[idx], k = ux();
        try { holder.removeAllChildren(true); } catch (e) { try { holder.removeAllChildrenWithCleanup(true); } catch (e2) { } }
        F.ui.nin[s] = null;
        var nin = makeNinja(u, s === F.me ? 1 : -1, s);
        if (nin) {
            nin.setPosition(cc.p(0, -60 * k)); holder.addChild(nin, 1); F.ui.nin[s] = nin;
        } else {
            var hd = head(u.head), fr = spr(IMG + 'nh_fight_frame.png');
            if (hd) { hd.setScale(1.6 * k); holder.addChild(hd, 1); } else holder.addChild(box(120, 60, 50, 255, 100 * k, 100 * k, -50 * k, -50 * k), 1);
            if (fr) { fr.setScale(1.6 * k); holder.addChild(fr, 2); }
        }
    }
    function buildFight() {
        var F = S.F; if (!F) return;
        kill('fight');
        var sz = WS(), W = sz.width, H = sz.height, cx = W / 2, k = ux(), L = overlay(cc.c4b(0, 0, 0, 255)), M = F.me, O = 1 - M;
        bg(L, 'nh_fight_arena_bg2.png', W, H);
        F.ui = { heads: {}, bars: {}, txt: {}, cdBox: [], cdTxt: [], pos: {}, nin: {}, dim: [], rost: [[], []], ninName: {}, skNode: null };

        // ── posisi: kedua ninja berdiri sejajar di panggung lebar, saling berhadapan ──
        var gy = H * 0.42, pos = {};
        pos[M] = cc.p(W * 0.25, gy); pos[O] = cc.p(W * 0.75, gy); F.ui.pos = pos;

        // ── header: panel kiri (saya) & kanan (lawan): nama, HP ninja aktif, roster 3 ninja ──
        var hh = 122 * k, pw = Math.min(W * 0.41, 420 * k), mg = 14 * k;
        L.addChild(box(0, 0, 0, 150, W, hh, 0, H - hh), 4);
        L.addChild(box(250, 200, 80, 255, W, 2, 0, H - hh - 2), 4);
        [M, O].forEach(function (s) {
            var u = F.f[s], left = s === M, x0 = left ? mg : W - mg - pw, ax = left ? 0 : 1, axx = left ? x0 + 6 * k : x0 + pw - 6 * k;
            L.addChild(lbl(u.name + '   Lv.' + u.lv, 22 * k, left ? GREEN : WHITE, axx, H - 20 * k, ax, 0.5), 6);
            var bh = 20 * k, by = H - 54 * k;
            L.addChild(box(250, 200, 80, 255, pw + 4, bh + 4, x0 - 2, by - 2), 5);                  // bingkai emas
            L.addChild(box(25, 10, 12, 255, pw, bh, x0, by), 6);                                    // dasar bar
            var fill = box(left ? 70 : 220, left ? 200 : 60, left ? 90 : 60, 255, pw, bh, x0, by); L.addChild(fill, 7); F.ui.bars[s] = fill;
            var t = lbl('', 14 * k, WHITE, x0 + pw / 2, by + bh / 2); L.addChild(t, 8); F.ui.txt[s] = t;
            // roster 3 ninja: ikon kepala + HP mini; yang sedang bertarung diberi bingkai emas
            var isz = 40 * k, gap = 6 * k, ry = H - 110 * k;
            for (var i = 0; i < u.units.length; i++) (function (i) {
                var rx = left ? x0 + i * (isz + gap) : x0 + pw - isz - i * (isz + gap), r = {};
                r.act = box(250, 200, 80, 255, isz + 6 * k, isz + 12 * k, rx - 3 * k, ry - 9 * k); L.addChild(r.act, 5);
                L.addChild(box(24, 14, 22, 255, isz, isz, rx, ry), 6);
                var hd = head(u.units[i].head);
                if (hd) { fitTo(hd, isz, isz); hd.setAnchorPoint(cc.p(0, 0)); hd.setPosition(cc.p(rx, ry)); L.addChild(hd, 7); }
                L.addChild(box(25, 10, 12, 255, isz, 5 * k, rx, ry - 8 * k), 7);
                r.bar = box(70, 200, 90, 255, isz, 5 * k, rx, ry - 8 * k); L.addChild(r.bar, 8);
                r.dead = box(0, 0, 0, 175, isz, isz, rx, ry); L.addChild(r.dead, 9); r.dead.setVisible(false);
                r.x = lbl('X', 26 * k, RED, rx + isz / 2, ry + isz / 2); L.addChild(r.x, 10); r.x.setVisible(false);
                F.ui.rost[s][i] = r;
            }(i));
            var nx = left ? x0 + u.units.length * (isz + gap) + 8 * k : x0 + pw - u.units.length * (isz + gap) - 8 * k;
            var nl = lbl('', 17 * k, GOLD, nx, ry + isz / 2 + 4 * k, left ? 0 : 1, 0.5); L.addChild(nl, 6); F.ui.ninName[s] = nl;
        });
        // tengah atas: VS + nomor giliran
        var vs = spr(IMG + 'nh_fight_vs.png'); if (vs) { vs.setScale(0.5 * k); vs.setPosition(cc.p(cx, H - 42 * k)); L.addChild(vs, 6); }
        F.ui.round = lbl('', 16 * k, GREY, cx, H - 88 * k); L.addChild(F.ui.round, 9);
        F.ui.note = lbl('', 22 * k, RED, cx, H * 0.58); L.addChild(F.ui.note, 9);
        // banner giliran di bawah header
        L.addChild(box(0, 0, 0, 150, 400 * k, 38 * k, cx - 200 * k, H - hh - 52 * k), 5);
        L.addChild(box(250, 200, 80, 255, 400 * k, 2, cx - 200 * k, H - hh - 52 * k), 5);
        F.ui.turn = lbl('', 24 * k, WHITE, cx, H - hh - 33 * k); L.addChild(F.ui.turn, 9);

        // ── petarung ──
        [O, M].forEach(function (s) {
            var holder = cc.Node.create(); holder.setPosition(pos[s]); L.addChild(holder, Z_ROLE);
            F.ui.heads[s] = holder;
        });
        S.fight = L;
        F.ui.stTxt = {};
        [O, M].forEach(function (s) { var tl = lbl('', 17 * k, c3(255, 220, 120), pos[s].x, pos[s].y - 92 * k); L.addChild(tl, Z_FLOAT - 1); F.ui.stTxt[s] = tl; });
        [O, M].forEach(function (s) { buildHolder(s, F.show[s]); refreshNames(s); });

        // ── bawah: alas tombol skill + tombol menyerah ──
        var bh2 = 134 * k;
        L.addChild(box(0, 0, 0, 150, W, bh2, 0, 0), 4);
        L.addChild(box(250, 200, 80, 255, W, 2, 0, bh2), 4);
        buildSkillButtons();
        button(L, 'SURRENDER', W - 84 * k, 70 * k, 136 * k, 46 * k, 'nh_fight_btn_red.png', function () {
            if (F.ended) return;
            if (Date.now() - F.leaveAt < 3000) { send('fightLeave'); } else { F.leaveAt = Date.now(); toast('Tap SURRENDER again to give up this fight.'); }
        }, 15 * k);
        L.schedule(function () { updateFight(); }, 0.05);
        attach(L);
        S.speed = Math.max(arenaSpeed(), FIGHT_SPEED_MIN); applyScale(S.speed);        // kecepatan otomatis = sama dengan arena (tanpa tombol)
        playAnim(0, 'daiji', true); playAnim(1, 'daiji', true);
        updateFight();
    }
    // tombol skill ninja milik saya yang sedang tampil (dibuat ulang saat ninja berganti)
    function buildSkillButtons() {
        var F = S.F, L = S.fight; if (!F || !L) return;
        var sz = WS(), W = sz.width, k = ux(), M = F.me;
        if (F.ui.skNode) { try { if (F.ui.skNode.getParent()) F.ui.skNode.removeFromParent(true); } catch (e) { } }
        L.btns = L.btns.filter(function (b) { return !b.sk; });
        var node = cc.Node.create(); L.addChild(node, 5); F.ui.skNode = node;
        F.ui.cdBox = []; F.ui.cdTxt = []; F.ui.dim = [];
        var sk = F.f[M].units[F.show[M]].skills, n = sk.length, size = (n > 4 ? 82 : 90) * k, gap = Math.min(size + 30 * k, (W * 0.64) / Math.max(1, n));
        var x0s = W / 2 - 40 * k - (n - 1) * gap / 2, sy = 78 * k;
        node.addChild(lbl('Ninja ' + (F.show[M] + 1) + ' / ' + F.f[M].units.length, 16 * k, GREY, 18 * k, 112 * k, 0, 0.5), 6);
        for (var i = 0; i < n; i++) (function (i) {
            var x = x0s + i * gap, y = sy, s = sk[i];
            var fr = spr(IMG + 'nh_fight_skillbtn.png'); if (fr) { fitTo(fr, size, size); fr.setPosition(cc.p(x, y)); node.addChild(fr, 5); }
            else node.addChild(box(30, 20, 28, 255, size, size, x - size / 2, y - size / 2), 5);
            var ic = spr('image/iskillicon/' + s.icon + '.png') || spr('image/iskillicon/morenSkill.png');
            if (ic) { ic.setPosition(cc.p(x, y)); ic.setScale(1.15 * k); node.addChild(ic, 6); }     // ikon DI ATAS bingkai (bingkai tengahnya solid)
            else node.addChild(lbl(s.name.substr(0, 6), 14 * k, WHITE, x, y), 6);
            var inner = size * 0.84;
            var dim = box(0, 0, 0, 120, inner, inner, x - inner / 2, y - inner / 2); node.addChild(dim, 7); F.ui.dim[i] = dim;       // redup saat bukan giliran
            var shade = box(0, 0, 0, 170, inner, inner, x - inner / 2, y - inner / 2); node.addChild(shade, 7); F.ui.cdBox[i] = shade;
            var ct = lbl('', 30 * k, WHITE, x, y); node.addChild(ct, 8); F.ui.cdTxt[i] = ct;
            var nm = String(s.name || ''), nmMax = n > 4 ? 11 : 14; if (nm.length > nmMax) nm = nm.substr(0, nmMax - 1) + '.';
            node.addChild(lbl(nm, 14 * k, GOLD, x, y - size / 2 - 11 * k), 6);
            L.btns.push({ sk: 1, x: x - size / 2 - 6, y: y - size / 2 - 6, w: size + 12, h: size + 12, fn: function () {
                if (F.ended) return;
                if (F.turn !== M) { toast("Wait for your opponent's turn."); return; }
                if (F.busy || F.hold || F.rd - (Date.now() - F.recv) > 0) return;                  // animasi jurus masih jalan
                var left = (F.cds[M][i] || 0) - (Date.now() - F.recv);
                if (left > 0) { toast('Skill recovering: ' + Math.ceil(left / 1000) + 's'); return; }
                send('fightSkill', { i: i });
            } });
        }(i));
    }
    function spawnFloat(side, text, col, size) {
        var F = S.F, L = S.fight; if (!F || !L || !text && text !== 0) return;
        var k = ux(), p = F.ui.pos[side], fy = p.y + (F.ui.nin && F.ui.nin[side] ? 105 * k : 45 * k), l = lbl(text, (size || 34) * k, col || WHITE, p.x + (Math.random() * 60 - 30) * k, fy);
        L.addChild(l, Z_FLOAT); F.floats.push({ n: l, t0: Date.now(), y: fy });
    }
    // Angka damage/heal/MISS gaya arena asli: armature "number" (red0-9, red-, green+, green0-9, baoji, shanbi) - sama seperti NumberBox di PVE.
    // Kalau armature gagal dimuat -> otomatis jatuh ke teks biasa (spawnFloat) seperti sebelumnya, jadi tidak pernah menggantung/crash.
    var NUM_OK = null;
    function numReady() {
        if (NUM_OK !== null) return NUM_OK;
        NUM_OK = false;
        try {
            ArmatureLoad.getInstance().addExportJson('number');
            var mgr = ccs.ArmatureDataManager.getInstance();           // wajib terdaftar dulu (sama seperti spawnEffect): kalau tidak SIGSEGV native
            NUM_OK = !(typeof mgr.getArmatureData === 'function' && !mgr.getArmatureData('number'));
        } catch (e) { NUM_OK = false; }
        return NUM_OK;
    }
    // text: '-4332' (merah) | '+21062' (hijau) | 'MISS'. o: { crit, big, miss, fbCol, fbSize, fbText }
    function spawnNum(side, text, o) {
        o = o || {};
        var F = S.F, L = S.fight; if (!F || !L) return;
        var fb = function () { spawnFloat(side, o.fbText != null ? o.fbText : text, o.fbCol || WHITE, o.fbSize || 34); };
        if (!numReady()) { fb(); return; }
        try {
            var k = ux(), p = F.ui.pos[side], fy = p.y + (F.ui.nin && F.ui.nin[side] ? 105 * k : 45 * k);
            var sc = (o.big ? 1.2 : 0.9) * k, step = 40 * sc, root = cc.Node.create(), tx = String(text);
            var mk = function (anim, x) {
                var a = ccs.Armature.create('number'); if (!a) return null;
                a.setScale(sc); a.setPosition(cc.p(x, 0)); root.addChild(a, 1);
                a.getAnimation().play(anim, -1, -1, 0); return a;
            };
            if (o.miss) { if (!mk('shanbi', 0)) { fb(); return; } }
            else {
                var col = tx.charAt(0) === '+' ? 'green' : 'red', n = tx.length, w = n * step, i;
                for (i = 0; i < n; i++) if (!mk(col + tx.charAt(i), (i - (n - 1) / 2) * step)) { fb(); return; }
                if (o.crit) mk('baoji', -(w / 2 + step * 1.4));
            }
            try { root.setCascadeOpacityEnabled(true); } catch (e) { }
            root.setPosition(cc.p(p.x + (Math.random() * 40 - 20) * k, fy));
            L.addChild(root, Z_FLOAT); F.floats.push({ n: root, t0: Date.now(), y: fy, keep: true });
        } catch (e) { fb(); }
    }
    // seluruh HP tampilan = HP server (dipakai saat tidak ada animasi berjalan)
    function syncShown(F) {
        for (var s = 0; s < 2; s++) for (var i = 0; i < F.U[s].length; i++) F.sh[s][i] = F.U[s][i].hp;
    }
    function pump() {
        var F = S.F; if (!F || F.busy) return;
        var job = F.q.shift(); if (!job) { if (!F.ended) syncShown(F); return; }
        F.busy = true;
        var finished = false;
        function fin() {
            if (finished || S.F !== F) return;
            finished = true; F.busy = false;
            send('fightAnimDone', { i: job.seq });                    // lapor ke server: animasi selesai, giliran berikutnya boleh dibuka
            pump();
        }
        F.todo.push({ at: Date.now() + 40000, fn: fin });             // pengaman: jangan pernah menggantung
        try { runCast(job, fin); } catch (e) { fin(); }
    }
    function onState(v) {
        var F = S.F; if (!F || F.id !== v.id) return;
        if (!S.fight || !S.fight.getParent()) { buildFight(); }
        F.recv = Date.now(); F.turn = v.turn; F.rd = v.rd || 0; F.tl = v.tl || 0; F.hold = v.hold ? 1 : 0;
        for (var s = 0; s < 2; s++) {
            var fs = v.f[s];
            F.st = F.st || [[], []]; F.st[s] = fs.st || [];
            F.cds[s] = fs.cd; F.skip[s] = fs.skip || 0; F.auto[s] = fs.auto ? 1 : 0;
            for (var i = 0; i < fs.u.length && i < F.U[s].length; i++) { F.U[s][i].hp = fs.u[i].hp; F.U[s][i].max = fs.u[i].max; }
        }
        var evs = v.ev || [], n = 0;
        while (n < evs.length) {
            var e = evs[n];
            if (e.t === 'skill') {                                    // satu jurus + semua akibatnya (heal/stun/KO/ninja masuk) = satu pekerjaan animasi
                var job = { skill: e, ev: [], seq: e.i }, m = n + 1;
                while (m < evs.length && evs[m].t !== 'skill' && evs[m].t !== 'end' && evs[m].t !== 'pass') { job.ev.push(evs[m]); job.seq = evs[m].i; m++; }
                F.q.push(job); n = m; continue;
            }
            if (e.t === 'pass') {
                spawnFloat(e.s, 'PASS', GREY, 28);
                var pj = { skill: null, ev: [], seq: e.i }, pm = n + 1, pfx = false;      // DOT / KO yang menyusul setelah giliran dilewati
                while (pm < evs.length && evs[pm].t !== 'skill' && evs[pm].t !== 'end' && evs[pm].t !== 'pass') { pj.ev.push(evs[pm]); pj.seq = evs[pm].i; if (evs[pm].t === 'dot' || evs[pm].t === 'down' || evs[pm].t === 'swap') pfx = true; pm++; }
                if (pfx) F.q.push(pj);
                n = pm; continue;
            }
            else if (e.t === 'auto') spawnFloat(e.s, 'AUTO', GOLD, 30);
            n++;
        }
        if (F.q.length && !F.busy) pump(); else if (!F.busy && !F.q.length) syncShown(F);
    }
    function updateFight() {
        var F = S.F, L = S.fight; if (!F || !L) return;
        var now = Date.now(), el = now - F.recv, M = F.me, k = ux();
        for (var q = F.todo.length - 1; q >= 0; q--) { if (F.todo[q] && F.todo[q].at <= now) { var job = F.todo.splice(q, 1)[0]; try { job.fn(); } catch (e) { } } }
        try {
            F.ui.round.setString(F.round ? 'TURN ' + F.round : '');
            if (F.ui.stTxt) for (var si = 0; si < 2; si++) { try { F.ui.stTxt[si].setString(F.ended ? '' : stText(F.st && F.st[si])); } catch (e) { } }
            for (var s = 0; s < 2; s++) {
                var sh = F.show[s], max = Math.max(1, F.U[s][sh].max), hpShown = F.sh[s][sh];
                F.dhp[s] += (hpShown - F.dhp[s]) * 0.25;
                F.ui.bars[s].setScaleX(Math.max(0, Math.min(1, F.dhp[s] / max)));
                F.ui.txt[s].setString(Math.round(hpShown) + ' / ' + max + '  (' + Math.round(hpShown / max * 100) + '%)');
                for (var ri = 0; ri < F.ui.rost[s].length; ri++) {          // roster: HP mini, ninja aktif bersorot, ninja KO digelapkan
                    var r = F.ui.rost[s][ri], dead = F.visDead[s][ri];
                    r.bar.setScaleX(Math.max(0, Math.min(1, F.sh[s][ri] / Math.max(1, F.U[s][ri].max))));
                    r.act.setVisible(ri === sh && !dead); r.dead.setVisible(!!dead); r.x.setVisible(!!dead);
                }
                var p = F.ui.pos[s], dx = 0, dy = 0;
                if (F.shake[s] > now) dx = (Math.random() * 16 - 8) * k;
                var mv = F.mv && F.mv[s]; if (mv) { var mk = Math.min(1, (now - mv.t0) / mv.dur); dx += mv.from + (mv.to - mv.from) * (1 - (1 - mk) * (1 - mk)); if (mk >= 1 && mv.to === 0) F.mv[s] = null; }
                if (!F.ended && F.ui.nin[s]) {
                    var an = F.anim[s];
                    if (an.until && now > an.until) {
                        an.until = 0; an.cur = '';
                        if (an.queue.length) playAnim(s, an.queue.shift(), false, 1600, true);
                        else if (!(an.hold > now)) an.lock = 0;
                    }
                    if (!an.until) playAnim(s, F.skip[s] > 0 ? 'zhengzha' : 'daiji', true);
                }
                F.ui.heads[s].setPosition(cc.p(p.x + dx, p.y + dy));
            }
            var myTurn = F.turn === M, rd = F.rd - el, tl = F.tl - el, secs = Math.max(0, Math.ceil(tl / 1000));
            var canAct = myTurn && rd <= 0 && !F.hold && !F.busy && !F.ended;
            if (F.ended) F.ui.turn.setString('');
            else if (F.busy || F.hold) { F.ui.turn.setString(myTurn ? 'GET READY...' : "OPPONENT'S TURN"); F.ui.turn.setColor(myTurn ? GREEN : GREY); }
            else if (myTurn && rd <= 0) { F.ui.turn.setString('YOUR TURN   ' + secs + 's'); F.ui.turn.setColor(GOLD); }
            else if (myTurn) { F.ui.turn.setString('GET READY...'); F.ui.turn.setColor(GREEN); }
            else { F.ui.turn.setString("OPPONENT'S TURN" + (F.auto[1 - M] ? '  (AUTO)' : (rd <= 0 && tl > 0 ? '   ' + secs + 's' : ''))); F.ui.turn.setColor(GREY); }
            for (var di = 0; di < F.ui.dim.length; di++) F.ui.dim[di].setVisible(!canAct);
            F.ui.note.setString(F.ended ? '' : (F.skip[M] > 0 ? 'STUNNED - you skip your next turn' : (F.auto[M] ? 'AUTO MODE - tap a skill to take control' : '')));
            F.ui.note.setColor(F.skip[M] > 0 ? RED : GOLD);
            for (var i = 0; i < F.ui.cdBox.length; i++) {
                var left = (F.cds[M][i] || 0) - el;
                if (left > 0 && F.cd > 0) { F.ui.cdBox[i].setVisible(true); F.ui.cdBox[i].setScaleY(Math.min(1, left / F.cd)); F.ui.cdTxt[i].setString(String(Math.ceil(left / 1000))); }
                else { F.ui.cdBox[i].setVisible(false); F.ui.cdTxt[i].setString(''); }
            }
            for (var j = F.floats.length - 1; j >= 0; j--) {
                var f = F.floats[j], a = (now - f.t0) / 1000;
                if (a >= (f.keep ? 1.1 : 1)) { try { f.n.removeFromParent(true); } catch (e) { } F.floats.splice(j, 1); continue; }
                f.n.setPosition(cc.p(f.n.getPosition().x, f.y + Math.min(a, 0.5) * 60 * k));   // angka armature naik sebentar lalu diam, seperti PVE
                if (!f.keep || a > 0.7) try { f.n.setOpacity(Math.round(255 * (f.keep ? Math.max(0, 1 - (a - 0.7) / 0.4) : 1 - a * a))); } catch (e) { }
            }
        } catch (e) { }
    }
    function onEnd(v) {
        var F = S.F; if (!F || F.id !== v.id) return;
        if (!S.fight || !S.fight.getParent()) buildFight();
        F.ended = true; F.q = [];
        (function () { var me = F.me, foe = 1 - me;
            F.mv = [null, null]; unlockAnim(0); unlockAnim(1);
            function down(s) { if (!F.visDead[s][F.show[s]]) playAnim(s, 'siwang', false, 0, true); }       // yang sudah jatuh tidak diputar ulang
            if (v.win === 1) { playAnim(me, 'shengli', true, 0, true); down(foe); }
            else if (v.win === -1) { down(me); playAnim(foe, 'shengli', true, 0, true); }
            else { playAnim(me, 'daiji', true, 0, true); playAnim(foe, 'daiji', true, 0, true); } }());
        var L = S.fight, sz = WS(), W = sz.width, H = sz.height, cx = W / 2, cy = H / 2, k = ux();
        var title = v.win === 1 ? 'VICTORY!' : (v.win === -1 ? 'DEFEAT' : 'DRAW');
        var col = v.win === 1 ? GOLD : (v.win === -1 ? RED : WHITE);
        var why = { ko: 'All ninja defeated', leave: 'Surrender', disconnect: 'Connection lost', afk: 'Turn timeout (inactive)' }[v.reason] || '';
        var pw = Math.min(W - 40, 560 * k), ph = 360 * k;
        L.addChild(box(0, 0, 0, 170, W, H, 0, 0), 20);
        L.addChild(box(30, 18, 26, 245, pw, ph, cx - pw / 2, cy - ph / 2), 21);
        L.addChild(box(250, 200, 80, 255, pw, 4, cx - pw / 2, cy + ph / 2 - 4), 22);
        L.addChild(box(250, 200, 80, 255, pw, 4, cx - pw / 2, cy - ph / 2), 22);
        L.addChild(lbl(title, 60 * k, col, cx, cy + ph / 2 - 62 * k), 23);
        L.addChild(lbl(why, 24 * k, WHITE, cx, cy + ph / 2 - 108 * k), 23);
        if (v.alive && v.total) L.addChild(lbl('Your ninja left: ' + v.alive[F.me] + '/' + v.total[F.me] + '      Opponent: ' + v.alive[1 - F.me] + '/' + v.total[1 - F.me], 20 * k, GREY, cx, cy + ph / 2 - 142 * k), 23);
        var w = v.week;
        L.addChild(lbl(v.counted ? 'This week: ' + w.wins + 'W ' + w.losses + 'L ' + w.draws + 'D   Win rate ' + w.rate + '%' : 'Not counted for ranking (same opponent limit this week)', 20 * k, GREEN, cx, cy + ph / 2 - 180 * k), 23);
        if (v.counted && w.total < v.minGames) L.addChild(lbl('Fight ' + (v.minGames - w.total) + ' more time(s) to enter the ranking.', 18 * k, GREY, cx, cy + ph / 2 - 210 * k), 23);
        ZB = 24;
        button(L, 'BACK TO ARENA', cx, cy - ph / 2 + 52 * k, 300 * k, 62 * k, 'nh_fight_btn.png', function () { kill('fight'); S.F = null; send('fightOpen'); }, 26 * k);
        ZB = 0;
        var b = L.btns.pop(); L.btns = [b];        // setelah selesai hanya tombol kembali yang aktif
    }

    // ═════════════════════════ PESAN SERVER ═════════════════════════
    if (typeof GameConnection.handleGameCommand === 'function') {
        var prev = GameConnection.handleGameCommand;
        GameConnection.handleGameCommand = function (key, value) {
            try {
                switch (key) {
                    case 'fightLobby': S.data = value; if (S.F) return; showLobby(); if (S.reward) { if (value.pending && value.pending.length) renderReward(); else kill('reward'); } return;
                    case 'fightInvite': if (!(S.F && !S.F.ended)) showInvite(value); return;
                    case 'fightMsg': if (value && value.pay) { showPayConfirm(value); return; } if (value && value.text && !value.quiet) toast(value.text); return;
                    case 'fightStart': startFight(value); return;
                    case 'fightState': onState(value); return;
                    case 'fightEnd': onEnd(value); return;
                    case 'fightClaimResult': toast(value.msg); if (Number(value.res) === 0) kill('reward'); return;
                }
            } catch (e) { try { cc.log('nhFight error: ' + e); } catch (e2) { } return; }
            return prev.apply(this, arguments);
        };
        GameConnection.__nhFight = true;
    }

    // ═════════════════════════ TOMBOL MASUK GEDUNG (HomeMenu) ═════════════════════════
    if (typeof HomeMenu !== 'undefined' && HomeMenu.prototype && !HomeMenu.prototype.__nhFight) {
        var hp = HomeMenu.prototype, buildUI = hp.buildUI, touchEnded = hp.onTouchesEnded;
        hp.buildUI = function () {
            var r = buildUI.apply(this, arguments);
            try {
                var c = this.controller, ref = c.costume, next = c.paihangbang;
                if (!ref || !next || this.nhFightBtn || !this.touchList || !this.posList) return r;
                var sprite = cc.Sprite.create(IMG + 'nh_fight_icon.png');
                if (!sprite) return r;
                var i1 = this.touchList.indexOf(ref), i2 = this.touchList.indexOf(next);
                if (i1 < 0 || i2 < 0 || !this.posList[i1] || !this.posList[i2]) return r;
                var rp = this.posList[i1], np = this.posList[i2], step = Math.abs(np.x - rp.x);
                var slot = this.nhRedeemBtn ? 2 : 1;            // satu slot setelah tombol Redeem kalau ada
                var pos = cc.p(rp.x - step * slot, rp.y);
                sprite.setAnchorPoint(ref.getAnchorPoint());
                sprite.setScale(ref.getScale());
                sprite.setPosition(pos);
                ref.getParent().addChild(sprite, ref.getLocalZOrder ? ref.getLocalZOrder() : 0);
                sprite._ty = BTN_TAG;
                this.touchList.splice(this.posList.length, 0, sprite);
                this.posList.push(pos);
                if (BuildData.getInstance().menuStatus == 0) { sprite.setVisible(false); sprite.setPosition(this.defaultPos); }
                this.nhFightBtn = sprite;
            } catch (e) { }
            return r;
        };
        hp.onTouchesEnded = function (touches) {
            var t = this.touchTarget;
            var res = touchEnded.apply(this, arguments);
            try {
                if (t && t._ty === BTN_TAG && t.isVisible() && GameTools.getInstance().onTouchesHit(touches[0], [t]) === t) {
                    AudioEngine.getInstance().playerEffectSound('click');
                    send('fightOpen');
                }
            } catch (e) { }
            return res;
        };
        hp.__nhFight = true;
    }
}());

// ═════════════════════════ GEDUNG FIGHT ARENA DI DESA ═════════════════════════
// Desa dibangun oleh HomeScene.createBg: tiap id di Config.buildingList -> `new HomeBuild().buildUI(id)`, posisi
// x = 180 + urutan * spacing_W, dan lebar scroll dihitung dari panjang daftar itu. Jadi cukup menyisipkan id khusus
// ke daftar SELAMA createBg berjalan (lalu dicabut lagi), menggambar gedungnya sendiri di buildUI, dan memasangnya
// di luar toucheList bawaan (supaya menu Upgrade/Enter bawaan tidak mencoba membaca id palsu). Sentuhan ditangani
// sendiri lewat pembungkus onTouchesBegan/Ended.
//
// Fitur gedung (sama seperti gedung lain):
//   • Obtain Silver : ikon silver muncul di atas gedung saat siap; tap -> `fightArenaProduce`; saat cooldown tampil hitung mundur.
//   • Upgrade/Enter : tap gedung -> muncul tombol Upgrade (`fightArenaUpgrade`) dan Enter (`fightOpen` -> lobi Fight to Fight).
//   • Aktif/nonaktif: diatur dari server, buildingConfig.js -> BUILDING_VISIBLE[90001] (true/false), tanpa build ulang APK.
// Data (level, cooldown, hasil) datang dari server lewat key `fightArena`.
// NH_FIGHT_SLOT: -1 = paling kanan (ujung), 0 = paling kiri, angka lain = urutan.
(function installFightBuilding() {
    var NH_FIGHT_BUILDING = true, NH_FIGHT_SLOT = -1, FID = 90001;
    var NH_FIGHT_GAP = 110;      // jarak TAMBAHAN (px desain) ke kanan dari slot normal (360 px) supaya tidak dempet dengan God Shinobi Tower
    if (!NH_FIGHT_BUILDING || typeof HomeScene === 'undefined' || !HomeScene.prototype || HomeScene.prototype.__nhFightBuilding) return;
    if (typeof HomeBuild === 'undefined' || !HomeBuild.prototype || typeof Config === 'undefined') return;

    // ── data dari server ──
    var FST = { loaded: false, lv: 1, maxLv: 10, cd: 0, gain: 0, upCost: 0, at: 0 }, curNode = null;
    function toast(t) { try { PromptBox.getInstance().updataTxt(t); } catch (e) { } }
    function fmt(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function leftSec() { return Math.max(0, FST.cd - Math.floor((Date.now() - FST.at) / 1000)); }
    function mmss(sec) {
        var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), r = sec % 60;
        return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(r);
    }
    function refreshNode() { try { if (curNode && curNode.getParent() && curNode.__nhRefresh) curNode.__nhRefresh(); } catch (e) { } }
    function onArena(v) {
        if (!v || typeof v !== 'object') return;
        FST.loaded = true; FST.at = Date.now();
        if (v.lv != null) FST.lv = Number(v.lv) || 1;
        if (v.maxLv != null) FST.maxLv = Number(v.maxLv) || FST.maxLv;
        if (v.cd != null) FST.cd = Number(v.cd) || 0;
        if (v.gain != null) FST.gain = Number(v.gain) || 0;
        if (v.upCost != null) FST.upCost = Number(v.upCost) || 0;
        if (v.got) toast('Obtained ' + fmt(v.got) + ' Silver');
        if (v.upgraded) toast('Fight Arena upgraded to Lv.' + v.upgraded);
        if (v.text) toast(v.text);
        refreshNode();
    }
    if (typeof GameConnection !== 'undefined' && typeof GameConnection.handleGameCommand === 'function' && !GameConnection.__nhFightArena) {
        var prevCmd = GameConnection.handleGameCommand;
        GameConnection.handleGameCommand = function (key, value) {
            if (key === 'fightArena') { try { onArena(value); } catch (e) { } return; }
            return prevCmd.apply(this, arguments);
        };
        GameConnection.__nhFightArena = true;
    }

    function withId(list) {
        var a = (list || []).filter(function (x) { return x !== FID; });
        if (NH_FIGHT_SLOT < 0 || NH_FIGHT_SLOT >= a.length) a.push(FID); else a.splice(NH_FIGHT_SLOT, 0, FID);
        return a;
    }
    function without(list) { return (list || []).filter(function (x) { return x !== FID; }); }
    function frame(name) { try { return GameTools.getInstance().getSpritePlist('image/ibuilding/' + name); } catch (e) { return null; } }
    function label(text, size, color, x, y) {
        var l = cc.LabelTTF.create(text, 'Arial', size);
        l.setColor(color); l.setPosition(cc.p(x, y)); return l;
    }

    // 1) gambar gedung (hanya untuk id khusus kita; bangunan lain tetap lewat kode asli)
    var origBuildUI = HomeBuild.prototype.buildUI;
    HomeBuild.prototype.buildUI = function (id) {
        if (id !== FID) return origBuildUI.apply(this, arguments);
        this.__nhFight = true;
        try {
            var self = this, s = cc.Sprite.create('image/ibg/nh_fight_building.png');
            if (!s) return;
            var c = s.getContentSize(), k = 0.72;   // sprite 3D baru 440x460 (lebar tampil ~317 px)
            s.setAnchorPoint(cc.p(0.5, 0)); s.setScale(k); s.setPosition(cc.p(0, 14));
            this.addChild(s, 1);
            this.__nhW = c.width * k; this.__nhH = c.height * k + 14;
            var H = this.__nhH;
            this.__nhSprite = s;

            // papan nama + level
            var tag = cc.LayerColor.create(cc.c4b(0, 0, 0, 150), 230, 30);
            tag.setPosition(cc.p(-115, -6)); this.addChild(tag, 2);
            var nameL = label('Fight Arena', 22, cc.c3b(255, 226, 130), 0, 9);
            this.addChild(nameL, 3);

            // ikon Obtain Silver (muncul bila siap) + hitung mundur
            var icon = frame('h_silver.png');
            if (icon) {
                icon.setAnchorPoint(cc.p(0.5, 0)); icon.setPosition(cc.p(0, H + 4)); icon.setVisible(false);
                this.addChild(icon, 4);
                try { icon.runAction(cc.RepeatForever.create(cc.Sequence.create(cc.MoveBy.create(0.6, cc.p(0, 8)), cc.MoveBy.create(0.6, cc.p(0, -8))))); } catch (e) { }
            }
            var cdL = label('', 20, cc.c3b(255, 255, 255), 0, H + 18); cdL.setVisible(false);
            this.addChild(cdL, 4);

            // menu Upgrade / Enter (muncul saat gedung di-tap)
            var menu = cc.Node.create(); menu.setVisible(false); this.addChild(menu, 10);
            var my = H + 54, mx = 64, msc = 0.85;   // menu di ATAS gedung (ikon Upgrade/Enter sudah memuat tulisannya sendiri)
            var up = frame('h_shengji.png'), en = frame('h_jinru.png');
            if (up) { up.setScale(msc); up.setPosition(cc.p(-mx, my)); menu.addChild(up, 1); }
            if (en) { en.setScale(msc); en.setPosition(cc.p(mx, my)); menu.addChild(en, 1); }
            var lvL = label('', 18, cc.c3b(255, 226, 130), -mx, my - 52);
            var costL = label('', 14, cc.c3b(255, 255, 255), -mx, my - 70);
            menu.addChild(lvL, 2); menu.addChild(costL, 2);
            this.__nhMenu = menu; this.__nhIcon = icon; this.__nhIconY = H + 4;
            this.__nhBtn = { upX: -mx, enX: mx, y: my, half: 46 };

            this.__nhRefresh = function () {
                try {
                    var left = leftSec(), ready = FST.loaded && left <= 0;
                    nameL.setString(FST.loaded ? 'Fight Arena  Lv.' + FST.lv : 'Fight Arena');
                    if (self.__nhIcon) self.__nhIcon.setVisible(ready);
                    cdL.setVisible(FST.loaded && left > 0);
                    if (left > 0) cdL.setString(mmss(left));
                    lvL.setString(FST.loaded ? 'Lv. ' + FST.lv : '');
                    costL.setString(FST.upCost > 0 ? fmt(FST.upCost) + ' Silver' : (FST.loaded ? 'MAX' : ''));
                } catch (e) { }
            };
            try { this.schedule(function () { self.__nhRefresh(); }, 1); } catch (e) { }
            curNode = this;
            this.__nhRefresh();
            try { GameConnection.send('fightArenaInfo', {}); } catch (e) { }
        } catch (e) { }
    };

    // 2) sisipkan id selama createBg; cabut dari daftar sentuhan bawaan sesudahnya
    var origCreateBg = HomeScene.prototype.createBg;
    HomeScene.prototype.createBg = function () {
        var cfg = null, res;
        try {
            cfg = Config.getInstance();
            cfg.buildingList = withId(cfg.buildingList);
            if (cfg.__nhAllBuildings) cfg.__nhAllBuildings = withId(cfg.__nhAllBuildings);   // toggle bangunan menyaring ulang dari sini
        } catch (e) { cfg = null; }
        try { res = origCreateBg.apply(this, arguments); }
        finally {
            try {
                if (cfg) { cfg.buildingList = without(cfg.buildingList); if (cfg.__nhAllBuildings) cfg.__nhAllBuildings = without(cfg.__nhAllBuildings); }
            } catch (e) { }
        }
        try {
            this.__nhFightNode = null;
            var tl = this.toucheList || [];
            for (var i = tl.length - 1; i >= 0; i--) {
                if (tl[i] && tl[i].__nhFight) { this.__nhFightNode = tl[i]; tl.splice(i, 1); }
            }
            // jarak ekstra dari bangunan sebelumnya (God Shinobi Tower): geser ke kanan + perluas batas geser layar
            if (this.__nhFightNode && NH_FIGHT_GAP > 0) {
                var fn = this.__nhFightNode, fp = fn.getPosition();
                fn.setPosition(cc.p(fp.x + NH_FIGHT_GAP, fp.y));
                var rx = (this.ratio && this.ratio.x) ? this.ratio.x : 1;
                this.maxRightX = (this.maxRightX || 0) + NH_FIGHT_GAP / rx;
            }
        } catch (e) { }
        return res;
    };

    // 3) sentuhan: tap singkat (bukan geser). Menentukan bagian yang kena: tombol menu / ikon silver / badan gedung
    function whatHit(node, touch) {
        try {
            var p = node.convertToNodeSpace(touch.getLocation());
            function inBox(cx, cy, hw, hh) { return p.x >= cx - hw && p.x <= cx + hw && p.y >= cy - hh && p.y <= cy + hh; }
            if (node.__nhMenu && node.__nhMenu.isVisible() && node.__nhBtn) {
                var b = node.__nhBtn;
                if (inBox(b.upX, b.y, 40, 56)) return 'up';
                if (inBox(b.enX, b.y, 40, 56)) return 'enter';
            }
            if (node.__nhIcon && node.__nhIcon.isVisible() && inBox(0, node.__nhIconY + 31, 26, 44)) return 'silver';
            if (p.x >= -node.__nhW / 2 - 8 && p.x <= node.__nhW / 2 + 8 && p.y >= -8 && p.y <= node.__nhH + 8) return 'body';
        } catch (e) { }
        return null;
    }
    var origBegan = HomeScene.prototype.onTouchesBegan, origEnded = HomeScene.prototype.onTouchesEnded;
    HomeScene.prototype.onTouchesBegan = function (touches) {
        try {
            var n = this.__nhFightNode, t = touches && touches[0];
            var kind = (n && t && n.getParent()) ? whatHit(n, t) : null;
            this.__nhFightDown = (n && t && n.getParent()) ? { x: t.getLocation().x, y: t.getLocation().y, at: Date.now(), kind: kind } : null;
        } catch (e) { this.__nhFightDown = null; }
        return origBegan.apply(this, arguments);
    };
    HomeScene.prototype.onTouchesEnded = function (touches) {
        var res = origEnded.apply(this, arguments);
        try {
            var d = this.__nhFightDown, n = this.__nhFightNode, t = touches && touches[0];
            this.__nhFightDown = null;
            if (d && n && t && n.getParent()) {
                var p = t.getLocation();
                var tap = Math.abs(p.x - d.x) < 18 && Math.abs(p.y - d.y) < 18 && Date.now() - d.at < 700;
                if (tap) {
                    var kind = whatHit(n, t), menu = n.__nhMenu, open = !!(menu && menu.isVisible());
                    if (kind) { try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) { } }
                    if (kind === 'silver') { GameConnection.send('fightArenaProduce', {}); }
                    else if (kind === 'up') { GameConnection.send('fightArenaUpgrade', {}); }
                    else if (kind === 'enter') { if (menu) menu.setVisible(false); GameConnection.send('fightOpen', {}); }
                    else if (kind === 'body') { if (menu) menu.setVisible(!open); if (!open) n.__nhRefresh(); }
                    else if (open) { menu.setVisible(false); }
                } else if (d.kind == null && n.__nhMenu && n.__nhMenu.isVisible()) {
                    n.__nhMenu.setVisible(false);          // geser layar di luar gedung: tutup menu
                }
            }
        } catch (e) { }
        return res;
    };
    HomeScene.prototype.__nhFightBuilding = true;
}());

// ════════════════════════════════════════════════════════════════════════════
// __NH_ARMGUARD — catat file armature yang HILANG ke logcat sebelum native memuatnya.
// Crash "SIGSEGV tinyxml2::XMLElement::FindAttribute" tidak bisa di-catch JS, jadi nama file
// harus dicatat SEBELUM addArmatureFileInfo. Cari di logcat: NH_ARMGUARD MISSING
// Matikan dengan NH_ARMGUARD_OFF = true.
// ════════════════════════════════════════════════════════════════════════════
(function __NH_ARMGUARD() {

    'use strict';

    if (typeof NH_ARMGUARD_OFF !== 'undefined' && NH_ARMGUARD_OFF) return;

    var tries = 0;

    function say(m) { try { if (typeof log === 'function') log('NH_ARMGUARD ' + m); } catch (e) {} }

    function exists(p) {

        try {

            var fu = cc.FileUtils.getInstance();

            if (typeof fu.fullPathForFilename === 'function') {

                var fp = String(fu.fullPathForFilename(p));

                if (fp && fp.charAt(0) === '/') return !!fu.isFileExist(fp);

            }

            return typeof fu.isFileExist === 'function' ? !!fu.isFileExist(p) : true;

        } catch (e) { return true; }

    }



    function install() {

        // 1. Guard GameTools addrameCachePlist & removeCachePlist (Crash juqing0.plist)

        if (typeof GameTools !== 'undefined' && GameTools.prototype && !GameTools.prototype.__nhPlistGuard) {

            GameTools.prototype.__nhPlistGuard = true;

            var origAddPlist = GameTools.prototype.addrameCachePlist;

            GameTools.prototype.addrameCachePlist = function (path, a2) {

                if (!path) return;

                var p = String(path);

                if (p.indexOf('juqing') !== -1) {

                    say('Blocked missing juqing plist: ' + path);

                    return;

                }

                return origAddPlist.apply(this, arguments);

            };



            var origRemPlist = GameTools.prototype.removeCachePlist;

            GameTools.prototype.removeCachePlist = function (path) {

                if (!path) return;

                var p = String(path);

                if (p.indexOf('juqing') !== -1) {

                    return;

                }

                return origRemPlist.apply(this, arguments);

            };

            say('GameTools Plist guard installed');

        }



        // 2. Guard ccs.ArmatureDataManager & ccs.Armature.create

        if (typeof ccs !== 'undefined') {

            if (ccs.ArmatureDataManager && ccs.ArmatureDataManager.prototype && !ccs.ArmatureDataManager.prototype.__nhArmGuard) {

                ccs.ArmatureDataManager.prototype.__nhArmGuard = true;

                var origAddArmInfo = ccs.ArmatureDataManager.prototype.addArmatureFileInfo;

                ccs.ArmatureDataManager.prototype.addArmatureFileInfo = function () {

                    for (var i = 0; i < arguments.length; i++) {

                        var f = arguments[i];

                        if (typeof f === 'string' && f && f.indexOf('juqing') !== -1) {

                            say('Blocked missing ArmatureFileInfo: ' + f);

                            return;

                        }

                    }

                    return origAddArmInfo.apply(this, arguments);

                };

            }



            var makeSafeDummyArmature = function (name) {

                say('Fallback safe dummy node for armature: ' + name);

                var dummy = (cc.Node.create ? cc.Node.create() : new cc.Node());

                dummy.getAnimation = function () {

                    return {

                        play: function () {},

                        playByIndex: function () {},

                        stop: function () {},

                        pause: function () {},

                        resume: function () {},

                        setMovementEventCallFunc: function () {},

                        setFrameEventCallFunc: function () {},

                        getCurrentMovementID: function () { return ''; }

                    };

                };

                dummy.setAnimation = function () {};

                dummy.getBone = function () { return null; };

                dummy.changeDisplayWithIndex = function () {};

                dummy.setAddDisplay = function () {};

                return dummy;

            }



            if (ccs.Armature && ccs.Armature.create && !ccs.Armature.__nhCreateGuard) {

                ccs.Armature.__nhCreateGuard = true;

                var origArmCreate = ccs.Armature.create;

                ccs.Armature.create = function (name) {

                    try {

                        var adm = (ccs.ArmatureDataManager && ccs.ArmatureDataManager.getInstance) ? ccs.ArmatureDataManager.getInstance() : null;

                        if (adm && typeof adm.getAnimationData === 'function' && name) {

                            var animData = adm.getAnimationData(name);

                            if (!animData) {

                                say('Animation data missing for ' + name + ', skipping native create to prevent SIGSEGV assert');

                                return makeSafeDummyArmature(name);

                            }

                        }

                        var arm = origArmCreate.apply(this, arguments);

                        if (arm) return arm;

                    } catch (e) {

                        say('ccs.Armature.create error for ' + name + ': ' + e);

                    }

                    return makeSafeDummyArmature(name);

                };

            }



            if (typeof ArmatureTools !== 'undefined' && ArmatureTools.roleArmature && !ArmatureTools.__nhRoleArmGuard) {

                ArmatureTools.__nhRoleArmGuard = true;

                var origRoleArm = ArmatureTools.roleArmature;

                ArmatureTools.roleArmature = function (roleId, costumeId) {

                    try {

                        var sk = (typeof skeleton !== 'undefined' && skeleton) ? skeleton : 'mainAction';

                        var al = (typeof ArmatureLoad !== 'undefined' && ArmatureLoad.getInstance) ? ArmatureLoad.getInstance() : null;

                        var isLoaded = al && al._armatureObject && al._armatureObject[sk];

                        if (!isLoaded) {

                            say('Armature ' + sk + ' not loaded, returning safe dummy');

                            return makeSafeDummyArmature(sk);

                        }

                        return origRoleArm.apply(this, arguments);

                    } catch (eRA) {

                        return makeSafeDummyArmature('mainAction');

                    }

                };

            }

        }



        // 2.5 Guard SceneEffectContainer (e.g. honghuo effect on home)

        if (typeof SceneEffectContainer !== 'undefined' && SceneEffectContainer.prototype && !SceneEffectContainer.prototype.__nhEffGuard) {

            SceneEffectContainer.prototype.__nhEffGuard = true;

            var origEffBuildUI = SceneEffectContainer.prototype.buildUI;

            SceneEffectContainer.prototype.buildUI = function (effectId, target) {

                try {

                    this._target = target;

                    this._done = 'removeSceneEffect';

                    var cfg = (typeof Config !== 'undefined' && Config.getInstance) ? Config.getInstance() : null;

                    var effData = (cfg && cfg.effectObject) ? cfg.effectObject[effectId] : null;

                    if (!effData) return;

                    this.playLeng = 0;

                    this._currentData = effData;

                    var jsonName = effData.exportJson;

                    var al = (typeof ArmatureLoad !== 'undefined' && ArmatureLoad.getInstance) ? ArmatureLoad.getInstance() : null;

                    var isLoaded = al && al._armatureObject && al._armatureObject[jsonName];

                    if (isLoaded) {

                        try {

                            this._armature = ccs.Armature.create(jsonName);

                            if (this._armature) {

                                this.addChild(this._armature);

                                if (this._armature.getAnimation) {

                                    this._armature.getAnimation().play(effData.timeline);

                                }

                                return;

                            }

                        } catch (eArm) {}

                    }

                    this._armature = makeSafeDummyArmature(jsonName || effectId);

                    this.addChild(this._armature);

                } catch (eEff) {

                    say('SceneEffectContainer safe error: ' + eEff);

                }

            };

            say('SceneEffectContainer safe buildUI guard installed');

        }



        // 3. Guard BuildData getOpeHelp to disable crashing old tutorial popups on buildings and team

        if (typeof BuildData !== 'undefined' && BuildData.prototype && !BuildData.prototype.__nhHelpGuard) {

            BuildData.prototype.__nhHelpGuard = true;

            BuildData.prototype.getOpeHelp = function () {

                return false;

            };

            say('BuildData getOpeHelp tutorial bypass installed');

        }



        // 4. RoleStopBox 2D Full-Body Sprite Fallback & Costume Resolution

        if (typeof RoleStopBox !== 'undefined' && RoleStopBox.prototype && !RoleStopBox.prototype.__nhFallbackInstalled) {

            RoleStopBox.prototype.__nhFallbackInstalled = true;

            var origUpdata = RoleStopBox.prototype.updata;



            RoleStopBox.prototype.ensureFallbackSprite = function (roleId, costumeId) {

                try {

                    if (this.img) {

                        try { this.removeChild(this.img, true); } catch (e) {}

                        this.img = null;

                    }

                    var cfg = (typeof Config !== 'undefined' && Config.getInstance) ? Config.getInstance() : null;

                    var costObj = (cfg && cfg.costmueObject && costumeId) ? cfg.costmueObject[costumeId] : null;

                    var roleObj = (cfg && cfg.roleObject && roleId) ? cfg.roleObject[roleId] : null;



                    var spritePaths = [];

                    if (costObj && costObj.xmlfile) {

                        spritePaths.push('image/idialogue/' + costObj.xmlfile + '_d.png');

                        spritePaths.push('image/icostume/' + costObj.xmlfile + '_u.png');

                        spritePaths.push('image/icostume/' + costObj.xmlfile + '_f.jpg');

                    }

                    if (roleObj && roleObj.xmlfile) {

                        spritePaths.push('image/idialogue/' + roleObj.xmlfile + '_d.png');

                    }

                    spritePaths.push('image/idialogue/ashuraotsusuki_d.png');

                    spritePaths.push('image/idialogue/mingren_d.png');



                    var loadedSprite = null;

                    for (var i = 0; i < spritePaths.length; i++) {

                        var spPath = spritePaths[i];

                        try {

                            loadedSprite = cc.Sprite.create(spPath);

                            if (loadedSprite) break;

                        } catch (eSp) {}

                    }

                    if (!loadedSprite) {

                        try { loadedSprite = cc.Sprite.create('image/idialogue/mingren_d.png'); } catch (eDef) {}

                    }



                    if (loadedSprite) {

                        this.img = loadedSprite;

                        this.img.setAnchorPoint(cc.p(0.5, 0));

                        this.img.setPosition(cc.p(0, 0));

                        var scale = (this.scl && this.scl !== 1) ? this.scl : 0.65;
                        var dir = (this.fx !== undefined) ? this.fx : 1;
                        this.img.setScaleX(scale * dir);
                        this.img.setScaleY(scale);

                        this.addChild(this.img, (this.zOrder || 0) + 1);

                    }

                } catch (eEns) {

                    say('ensureFallbackSprite error: ' + eEns);

                }

            };



            RoleStopBox.prototype.updata = function (roleId, b, costumeId, qlv) {

                var realRoleId = roleId;

                var realCostumeId = costumeId;

                if (Array.isArray(realCostumeId)) {

                    realCostumeId = realCostumeId[0] || null;

                }



                if (!realRoleId && realCostumeId) {

                    try {

                        var rd = (typeof RoleData !== 'undefined' && RoleData.getInstance) ? RoleData.getInstance() : null;

                        if (rd) {

                            if (typeof rd.getRoleID === 'function') realRoleId = rd.getRoleID(realCostumeId);

                            if (!realRoleId && rd.heros && rd.heros[realCostumeId]) realRoleId = rd.heros[realCostumeId].id;

                            if (!realRoleId && rd.currentKey && typeof rd.getRoleID === 'function') realRoleId = rd.getRoleID(rd.currentKey);

                        }

                    } catch (eRes) {}

                }



                var res;

                if (realRoleId) {

                    try {

                        res = origUpdata.call(this, realRoleId, b, realCostumeId, qlv);

                    } catch (eOrig) {

                        say('origUpdata error for ' + realRoleId + ': ' + eOrig);

                    }

                } else {

                    this.rid = null;

                    this.cid = realCostumeId;

                    this.qlv = qlv;

                    this.noEffect = b;

                }



                // If after updata, neither an active armature nor an image exists, provide fallback 2D sprite

                try {

                    var hasArmature = this.roleArmature && this.roleArmature.getParent && this.roleArmature.getParent();

                    var hasImg = this.img && this.img.getParent && this.img.getParent();

                    if (!hasArmature && !hasImg) {

                        this.ensureFallbackSprite(realRoleId, realCostumeId);

                    }

                } catch (eCheck) {}



                return res;

            };

            say('RoleStopBox fallback & guard installed');

        }



        // 5. Chakra Type String-to-Int Guard:

        if (typeof RoleData !== 'undefined' && RoleData.prototype && !RoleData.prototype.__nhChakraFixed) {

            RoleData.prototype.__nhChakraFixed = true;

            var origGetChakraRes = RoleData.prototype.getChakraRes;

            RoleData.prototype.getChakraRes = function (a) {

                if (a !== undefined && a !== null) {

                    a = parseInt(a);

                    if (isNaN(a)) a = 1;

                }

                var res = origGetChakraRes.call(this, a);

                return res;

            };

            say('RoleData Chakra guard installed');

        }



        // 5.5 HomeArmature Roaming Ninjas in HomeScene Lawn (Full Animated Limbs + Pick Up & Fall + Chat Bubble)
        if (typeof HomeArmature !== 'undefined' && HomeArmature.prototype && !HomeArmature.prototype.__nhEnhancedRoaming) {
            HomeArmature.prototype.__nhEnhancedRoaming = true;

            HomeArmature.prototype.buildUI = function (roleId, b, c, d, maxRightX, costumeId, heroKey) {
                try {
                    this.id = heroKey || roleId;
                    this.rid = roleId;
                    this.cid = costumeId || 0;
                    this.homeWidt = maxRightX || 2500;
                    this.numW = c || 350;
                    this._ty = 2; // Crucial for HomeScene touch identification
                    this.NpcTalkList = [];
                    for (var t = 200101; t <= 200199; t++) {
                        if (typeof Config !== 'undefined' && Config.getInstance().NpcTalkObject && Config.getInstance().NpcTalkObject[t]) {
                            this.NpcTalkList.push(t);
                        }
                    }

                    // Try real role armature first with skeletal bones (moving arms, hands, legs and feet)
                    var createdArm = null;
                    try {
                        if (typeof ArmatureTools !== 'undefined' && typeof ArmatureTools.roleArmature === 'function') {
                            createdArm = ArmatureTools.roleArmature(roleId, costumeId);
                        }
                    } catch (eArm) {
                        say('HomeArmature roleArmature error: ' + eArm);
                    }

                    if (this.armature) {
                        try { this.removeChild(this.armature, true); } catch (e) {}
                        this.armature = null;
                    }
                    if (this.img) {
                        try { this.removeChild(this.img, true); } catch (e) {}
                        this.img = null;
                    }

                    // Natural lawn ground coordinates & proportioned heroic size
                    this._Y = 115;
                    this.wnum = 80;
                    this.hnum = 130;
                    this.runW = 400;
                    this.scl = 0.75; // Proportioned heroic scale on lawn
                    this.walkPhase = Math.random() * 6.28;

                    var spacingZone = (c && c > 0) ? c : 350;
                    var idx = (typeof b === 'number') ? b : 0;
                    var rndOffset = parseInt(Math.random() * (spacingZone / 2));

                    this.Vx = idx * spacingZone + 150;
                    this._X = idx * spacingZone + rndOffset + 150;
                    if (d && typeof d.X === 'number' && d.X > 50) {
                        this._X = d.X;
                    }
                    if (d && typeof d.Y === 'number' && d.Y > 50) {
                        this._Y = d.Y;
                    }

                    this.spX = 1.1; // Smooth natural walking speed
                    this.minX = Math.max(100, this.Vx - (parseInt(Math.random() * spacingZone) + spacingZone / 2));
                    this.maxX = Math.min(this.homeWidt - 100, this.Vx + parseInt(Math.random() * spacingZone) + spacingZone / 2);
                    this.fx = (Math.random() < 0.5) ? -1 : 1;

                    this.movStop = parseInt(Math.random() * 200 + 150); // 3-6s standing idle
                    this.movPlay = parseInt(Math.random() * 180 + 120); // 2-5s walking
                    this.movWait = parseInt(Math.random() * 60 + 20);
                    this.mov = this.movWait;
                    this.showTm = 0;
                    this.spY = 0;
                    this.isFalling = false;
                    this.onToucheStatus = false;
                    this.opacity = 255;

                    // ALWAYS attach the visual 2D hero sprite so the ninja is 100% visible!
                    this.ensureHomeVisual(roleId, costumeId);

                    if (typeof this.setScaleX === 'function') this.setScaleX(this.fx * this.scl);
                    if (typeof this.setScaleY === 'function') this.setScaleY(this.scl);
                    if (typeof this.setPositionX === 'function') this.setPositionX(this._X);
                    if (typeof this.setPositionY === 'function') this.setPositionY(this._Y);

                    // Initial idle stand animation
                    var animStand = (typeof armatureStand !== 'undefined') ? armatureStand : "daiji";
                    this.gotoplay(animStand);
                } catch (eHVis) {
                    say('HomeArmature buildUI error: ' + eHVis);
                }
            };

            HomeArmature.prototype.ensureHomeVisual = function (roleId, costumeId) {
                try {
                    if (this.img) {
                        try { this.removeChild(this.img, true); } catch (e) {}
                        this.img = null;
                    }

                    var cfg = (typeof Config !== 'undefined' && Config.getInstance) ? Config.getInstance() : null;
                    var costObj = (cfg && cfg.costmueObject && costumeId) ? cfg.costmueObject[costumeId] : null;
                    var roleObj = (cfg && cfg.roleObject && roleId) ? cfg.roleObject[roleId] : null;

                    var xmlfile = (costObj && costObj.xmlfile) ? costObj.xmlfile : (roleObj && roleObj.xmlfile ? roleObj.xmlfile : '');
                    var spritePaths = [];
                    if (xmlfile) {
                        spritePaths.push('image/idialogue/' + xmlfile + '_d.png');
                        spritePaths.push('image/iroleHead/' + xmlfile + '_h.png');
                    }
                    spritePaths.push('image/idialogue/muyewan_d.png');
                    spritePaths.push('image/idialogue/ashuraotsusuki_d.png');
                    spritePaths.push('image/idialogue/mingren_d.png');

                    var loadedSprite = null;
                    for (var i = 0; i < spritePaths.length; i++) {
                        try {
                            loadedSprite = cc.Sprite.create(spritePaths[i]);
                            if (loadedSprite && loadedSprite.getContentSize().width > 0) break;
                            loadedSprite = null;
                        } catch (eSp) {}
                    }
                    if (!loadedSprite) {
                        try { loadedSprite = cc.Sprite.create('image/idialogue/muyewan_d.png'); } catch (eDef) {}
                    }

                    if (loadedSprite) {
                        this.img = loadedSprite;
                        this.img.setAnchorPoint(cc.p(0.5, 0));
                        this.img.setPosition(cc.p(0, 0));
                        var sz = loadedSprite.getContentSize();
                        var h = (sz && sz.height > 0) ? sz.height : 360;
                        var lawnScale = 140 / h;
                        this.lawnScale = lawnScale;
                        this.img.setScale(lawnScale);
                        this.addChild(this.img, 1);
                    }
                } catch (eHV) {
                    say('ensureHomeVisual error: ' + eHV);
                }
            };

            HomeArmature.prototype.gotoplay = function (animName) {
                try {
                    this.armatureStatus = animName;
                    if (this.armature && typeof this.armature.getAnimation === 'function') {
                        var anim = this.armature.getAnimation();
                        if (anim && typeof anim.play === 'function') {
                            anim.play(animName, -1, -1, 1);
                        }
                    }
                } catch (eGP) {
                    this.armatureStatus = animName;
                }
            };

            // LIFTED / PICKED UP: Struggle pose with flailing limbs and expression like about to fall!
            HomeArmature.prototype.onIn = function () {
                this.onToucheStatus = true;
                this.isFalling = false;
                this.removeBubbleBox();
                var animZhengzha = (typeof armatureZhengzha !== 'undefined') ? armatureZhengzha : "zhengzha";
                this.gotoplay(animZhengzha);
                try {
                    if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                        AudioEngine.getInstance().playerEffectSound("child");
                    }
                } catch (eAud) {}
            };

            // RELEASED / DROPPED: If released above ground, trigger falling physics!
            HomeArmature.prototype.onOut = function () {
                var curY = this.getPositionY();
                var groundY = this._Y || 115;
                if (curY > groundY + 12) {
                    this.isFalling = true;
                    this.spY = 0; // Initial drop speed
                    var animJiangluo = (typeof armatureJiangluo !== 'undefined') ? armatureJiangluo : "jiangluo";
                    this.gotoplay(animJiangluo); // Falling animation!
                } else {
                    this.setPositionY(groundY);
                    this.onToucheStatus = false;
                    this.isFalling = false;
                    var animStand = (typeof armatureStand !== 'undefined') ? armatureStand : "daiji";
                    this.gotoplay(animStand);
                    if (this.img) {
                        this.img.setRotation(0);
                        this.img.setScaleY(this.lawnScale || 0.38);
                        this.img.setPositionY(0);
                    }
                }
                this.removeBubbleBox();
            };

            HomeArmature.prototype.onFrames = function () {
                if (typeof this.mov !== 'number' || isNaN(this.mov)) this.mov = 0;
                if (typeof this.movStop !== 'number' || isNaN(this.movStop)) this.movStop = 200;
                if (typeof this.movPlay !== 'number' || isNaN(this.movPlay)) this.movPlay = 150;
                if (typeof this.spX !== 'number' || isNaN(this.spX) || this.spX <= 0) this.spX = 1.2;
                if (this.fx !== 1 && this.fx !== -1) this.fx = 1;
                if (typeof this._Y !== 'number') this._Y = 115;
                if (typeof this.homeWidt !== 'number') this.homeWidt = 2500;
                if (typeof this.minX !== 'number') this.minX = 100;
                if (typeof this.maxX !== 'number') this.maxX = this.homeWidt - 100;
                if (!this.lawnScale) this.lawnScale = 0.38;

                // 1. Falling physics with gravity acceleration
                if (this.isFalling) {
                    this.spY = (this.spY || 0) + 1.8;
                    var curY = this.getPositionY() - this.spY;
                    var groundY = this._Y || 115;
                    if (curY <= groundY) {
                        curY = groundY;
                        this.setPositionY(groundY);
                        this.isFalling = false;
                        this.onToucheStatus = false;
                        this.spY = 0;
                        // Landed! Play dizzy/stars or impact
                        var animLeiyun = (typeof armatureLeiyun !== 'undefined') ? armatureLeiyun : "leiyun";
                        var animStand = (typeof armatureStand !== 'undefined') ? armatureStand : "daiji";
                        try {
                            this.gotoplay(animLeiyun);
                            if (typeof AudioEngine !== 'undefined' && AudioEngine.getInstance) {
                                AudioEngine.getInstance().playerEffectSound("bomb02");
                            }
                        } catch (e) {
                            this.gotoplay(animStand);
                        }
                        if (this.img) {
                            // Impact ground squash!
                            this.img.setScaleY(this.lawnScale * 0.72);
                            this.img.setRotation(0);
                            this.img.setPositionY(0);
                        }
                        this.mov = 0;
                        this.movStop = 90; // Stunned/dizzy on ground for ~1.5s
                        this.movPlay = 150;
                        var self = this;
                        setTimeout(function () {
                            if (self && !self.onToucheStatus && !self.isFalling) {
                                self.gotoplay(animStand);
                                if (self.img) {
                                    self.img.setScaleY(self.lawnScale);
                                }
                            }
                        }, 1200);
                    } else {
                        this.setPositionY(curY);
                        if (this.img) {
                            this.img.setRotation(-8 * this.fx);
                            this.img.setScaleY(this.lawnScale * 1.15);
                        }
                    }
                    return; // Skip walking while falling
                }

                // 2. Being held / dragged by player in air: flailing struggle expression!
                if (this.onToucheStatus) {
                    var animZhengzha = (typeof armatureZhengzha !== 'undefined') ? armatureZhengzha : "zhengzha";
                    if (this.armatureStatus !== animZhengzha) {
                        this.gotoplay(animZhengzha);
                    }
                    if (this.img) {
                        this.strugglePhase = (this.strugglePhase || 0) + 0.35;
                        var struggleWiggle = Math.sin(this.strugglePhase) * 14;
                        this.img.setRotation(struggleWiggle);
                        var struggleStretch = 1.0 + Math.abs(Math.sin(this.strugglePhase * 2)) * 0.08;
                        this.img.setScaleY(this.lawnScale * struggleStretch);
                    }
                    return; // Skip walking while being held
                }

                // Unstuck if clamped near left edge
                var curX = (typeof this.getPositionX === 'function') ? this.getPositionX() : 0;
                if (curX <= 50) {
                    var safeX = (this._X && this._X > 100) ? this._X : (200 + Math.random() * 200);
                    if (typeof this.setPositionX === 'function') this.setPositionX(safeX);
                    this.fx = 1;
                    if (typeof this.setScaleX === 'function') this.setScaleX(this.fx * this.scl);
                }

                // 3. Normal village walking cycle with dynamic stepping, limb motion and bobbing
                this.mov++;
                var animStand = (typeof armatureStand !== 'undefined') ? armatureStand : "daiji";
                var animWalk = (typeof armatureZoulu !== 'undefined') ? armatureZoulu : "zoulu";

                if (this.mov < this.movStop) {
                    // Standing idle breathing
                    if (this.armatureStatus !== animStand) {
                        this.gotoplay(animStand);
                    }
                    if (this.img) {
                        this.img.setRotation(0);
                        this.img.setPositionY(0);
                        this.breathPhase = (this.breathPhase || 0) + 0.05;
                        var breath = Math.sin(this.breathPhase) * 0.025;
                        this.img.setScaleY(this.lawnScale * (1.0 + breath));
                    }
                } else if (this.mov < this.movStop + this.movPlay) {
                    // Walking with hand and foot movement!
                    if (this.armatureStatus !== animWalk) {
                        this.gotoplay(animWalk);
                    }
                    var nowX = this.getPositionX();
                    var stepX = nowX + this.spX * this.fx;
                    if (stepX <= this.minX) {
                        stepX = this.minX;
                        this.fx = 1;
                        if (typeof this.setScaleX === 'function') this.setScaleX(this.fx * this.scl);
                    } else if (stepX >= this.maxX) {
                        stepX = this.maxX;
                        this.fx = -1;
                        if (typeof this.setScaleX === 'function') this.setScaleX(this.fx * this.scl);
                    }
                    this.setPositionX(stepX);

                    if (this.img) {
                        this.walkPhase = (this.walkPhase || 0) + 0.18;
                        // 1. Stepping bob up and down (feet lifting off grass)
                        var stepLift = Math.abs(Math.sin(this.walkPhase)) * 6.5;
                        this.img.setPositionY(stepLift);
                        // 2. Alternating foot step sway & arm movement tilt
                        var stepSway = Math.sin(this.walkPhase) * 7.5;
                        this.img.setRotation(stepSway * this.fx);
                        // 3. Dynamic foot plant squish & stretch
                        var stepSquash = Math.sin(this.walkPhase * 2) * 0.05;
                        this.img.setScaleY(this.lawnScale * (1.0 + stepSquash));
                    }
                } else {
                    // Reset cycle
                    this.mov = 0;
                    this.movStop = parseInt(Math.random() * 200 + 150);
                    this.movPlay = parseInt(Math.random() * 180 + 120);
                    if (Math.random() < 0.4) {
                        this.fx = -this.fx;
                        if (typeof this.setScaleX === 'function') this.setScaleX(this.fx * this.scl);
                    }
                }
            };

            // Fix Chat Bubble position (Directly above ninja head, NOT cut off at top of screen)
            HomeArmature.prototype.addBubbleBox = function () {
                this.removeBubbleBox();
                if (!this.bubbleBox) {
                    this.bubbleTM = 0;
                    var talkId = 4000 + parseInt(Math.random() * 80);
                    this.bubbleBox = new BubbleBox();
                    this.addChild(this.bubbleBox, 100);

                    var txt = "";
                    try {
                        var cfg = (typeof Config !== 'undefined' && Config.getInstance) ? Config.getInstance() : null;
                        if (cfg && cfg.textObject && cfg.textObject[talkId]) {
                            txt = cfg.textObject[talkId];
                        }
                    } catch (e) {}
                    if (!txt) txt = "...";

                    try {
                        this.bubbleBox.tf_AddOutlineScale(txt, 18, 5, 1.8);
                    } catch (e) {}

                    // Position directly above ninja head:
                    // In HomeArmature local space, ninja is ~120-140px tall.
                    // 130px puts the speech bubble right above the head on the grass, NOT in the sky!
                    this.bubbleBox.setPosition(cc.p(0, 130));

                    // Keep bubble text facing correctly (not mirrored when ninja faces left)
                    var curSx = (typeof this.getScaleX === 'function') ? this.getScaleX() : 1;
                    if (curSx < 0) {
                        this.bubbleBox.setScaleX(-1);
                    } else {
                        this.bubbleBox.setScaleX(1);
                    }
                }
            };

            say('HomeArmature enhanced roaming, touch, drop & bubble installed');
        }

        // 5.5b HomeScene Touch Drag & Drop Interceptor for Roaming Ninjas
        if (typeof HomeScene !== 'undefined' && HomeScene.prototype && !HomeScene.prototype.__nhTouchNinjaFix) {
            HomeScene.prototype.__nhTouchNinjaFix = true;

            var origHit = HomeScene.prototype.hit;
            HomeScene.prototype.hit = function (touch) {
                try {
                    if (this.armature_Datas && touch && typeof touch.getLocation === 'function') {
                        var touchPos = touch.getLocation();
                        for (var k in this.armature_Datas) {
                            var entry = this.armature_Datas[k];
                            var ha = (entry && entry.onIn) ? entry : (entry && entry.armature && entry.armature.onIn ? entry.armature : null);
                            if (!ha) continue;
                            if (ha.isVisible && !ha.isVisible()) continue;
                            if (ha.opacity === 0) continue;

                            var worldPos = this.Home_jianzhu ? this.Home_jianzhu.convertToWorldSpace(ha.getPosition()) : ha.getPosition();
                            var scl = Math.abs(ha.scl || 0.75);
                            var w = (ha.wnum || 80) * scl;
                            var h = (ha.hnum || 130) * scl;

                            // Generous touch hit box around the walking ninja
                            var rect = cc.rect(worldPos.x - w - 25, worldPos.y - 15, w * 2 + 50, h + 40);
                            if (cc.rectContainsPoint(rect, touchPos)) {
                                return ha; // Return the HomeArmature instance directly!
                            }
                        }
                    }
                } catch (eHit) {
                    say('HomeScene hit error: ' + eHit);
                }
                if (origHit) return origHit.apply(this, arguments);
                return null;
            };

            var origTouchesBegan = HomeScene.prototype.onTouchesBegan;
            HomeScene.prototype.onTouchesBegan = function (touches) {
                if (touches && touches.length > 0) {
                    var hitNinja = this.hit(touches[0]);
                    if (hitNinja && (hitNinja._ty === 2 || hitNinja instanceof HomeArmature || typeof hitNinja.onIn === 'function')) {
                        this.lastTouchTarget = hitNinja;
                        this._touchNinjaStart = touches[0].getLocation();
                        this._isDraggingNinja = false;
                        this._ninjaMoved = false;
                        return; // Successfully locked onto ninja!
                    }
                }
                if (origTouchesBegan) return origTouchesBegan.apply(this, arguments);
            };

            var origTouchesMoved = HomeScene.prototype.onTouchesMoved;
            HomeScene.prototype.onTouchesMoved = function (touches) {
                if (this.lastTouchTarget && (this.lastTouchTarget._ty === 2 || this.lastTouchTarget instanceof HomeArmature || typeof this.lastTouchTarget.onIn === 'function')) {
                    if (touches && touches.length > 0) {
                        var curPos = touches[0].getLocation();
                        var startPos = this._touchNinjaStart || curPos;
                        var dist = Math.hypot(curPos.x - startPos.x, curPos.y - startPos.y);
                        if (dist > 10 || this._isDraggingNinja) {
                            this._isDraggingNinja = true;
                            this._ninjaMoved = true;
                            if (!this.lastTouchTarget.onToucheStatus) {
                                this.lastTouchTarget.onIn(); // STRUGGLE POSE ("zhengzha")!
                            }
                            if (this.Home_jianzhu) {
                                var localPos = this.Home_jianzhu.convertToNodeSpace(curPos);
                                var groundY = this.lastTouchTarget._Y || 115;
                                this.lastTouchTarget.setPosition(localPos.x, Math.max(groundY, localPos.y - 30));
                            }
                            return;
                        }
                    }
                }
                if (origTouchesMoved) return origTouchesMoved.apply(this, arguments);
            };

            var origTouchesEnded = HomeScene.prototype.onTouchesEnded;
            HomeScene.prototype.onTouchesEnded = function (touches) {
                if (this.lastTouchTarget && (this.lastTouchTarget._ty === 2 || this.lastTouchTarget instanceof HomeArmature || typeof this.lastTouchTarget.onIn === 'function')) {
                    var targetNinja = this.lastTouchTarget;
                    this.lastTouchTarget = null;
                    if (this._isDraggingNinja || targetNinja.onToucheStatus) {
                        targetNinja.onOut(); // Triggers falling physics with gravity!
                    } else if (!this._ninjaMoved) {
                        // Simple tap: show speech bubble!
                        targetNinja.addBubbleBox();
                    }
                    this._isDraggingNinja = false;
                    this._ninjaMoved = false;
                    return;
                }
                if (origTouchesEnded) return origTouchesEnded.apply(this, arguments);
            };

            var origTouchesCancelled = HomeScene.prototype.onTouchesCancelled;
            HomeScene.prototype.onTouchesCancelled = function (touches) {
                if (this.lastTouchTarget && (this.lastTouchTarget._ty === 2 || this.lastTouchTarget instanceof HomeArmature || typeof this.lastTouchTarget.onIn === 'function')) {
                    this.lastTouchTarget.onOut();
                    this.lastTouchTarget = null;
                    this._isDraggingNinja = false;
                    return;
                }
                if (origTouchesCancelled) return origTouchesCancelled.apply(this, arguments);
            };
        }

        // 5.6 HomeScene LoadRole Spawn Assurance (Make sure owned ninjas appear on lawn)

        if (typeof HomeScene !== 'undefined' && HomeScene.prototype && !HomeScene.prototype.__nhSpawnGuard) {

            HomeScene.prototype.__nhSpawnGuard = true;

            var origLoadRole = HomeScene.prototype.loadRole;

            HomeScene.prototype.loadRole = function () {

                var res = origLoadRole.apply(this, arguments);

                try {

                    var self = this;

                    var ensureAllHeroesSpawned = function () {

                        try {

                            if (!self.Home_jianzhu) return;

                            var rd = (typeof RoleData !== 'undefined' && RoleData.getInstance) ? RoleData.getInstance() : null;

                            var hList = (rd && rd.heroList) ? rd.heroList : [];

                            if (!self.armature_Datas) self.armature_Datas = {};

                            var totalWidth = (self.open_L && self.spacing_W) ? (self.open_L * self.spacing_W) : (self.maxRightX || 2500);

                            if (totalWidth < 1200) totalWidth = 2400;

                            var count = Math.min(hList.length, 6);

                            if (count <= 0) count = 1;

                            var numW = Math.max(300, parseInt(totalWidth / count));



                            for (var i = 0; i < count; i++) {

                                var hid = hList[i];

                                if (!hid) continue;

                                if (!self.armature_Datas[hid]) {

                                    var rid = (rd && rd.getRoleID) ? rd.getRoleID(hid) : hid;

                                    var cid = (rd && rd.getCostumeID) ? rd.getCostumeID(hid) : 0;

                                    var ha = new HomeArmature();

                                    self.Home_jianzhu.addChild(ha, 10, 50 - i);

                                    ha.buildUI(rid, i, numW, null, totalWidth, cid, hid);

                                    self.armature_Datas[hid] = { armature: ha, pos: ha.getPosition() };

                                }

                            }

                        } catch (eSpawn) {

                            say('ensureAllHeroesSpawned error: ' + eSpawn);

                        }

                    };

                    if (typeof setTimeout === 'function') setTimeout(ensureAllHeroesSpawned, 300);

                    else ensureAllHeroesSpawned();

                } catch (eLRole) {}

                return res;

            };

            say('HomeScene LoadRole spawn assurance installed');

        }



        // 6. Guard ArmatureLoad async loading (Fix Gacha Ninja & Loader Freeze & Recursion)

        if (typeof ArmatureLoad === 'undefined' || !ArmatureLoad.prototype) {

            if (++tries < 20 && typeof setTimeout === 'function') setTimeout(install, 500);

            return;

        }

        var P = ArmatureLoad.prototype;

        if (P.__nhArmGuard) return;

        P.__nhArmGuard = true;



        if (typeof P.addXML === 'function') {

            var ax = P.addXML;

            P.addXML = function (name) {

                try {

                    var b = String(this.sXML_URL) + name;

                    if (name.indexOf('juqing') !== -1 || (!exists(b + '.xml') && !exists(b + '.plist'))) {

                        say('SKIPPING MISSING XML: ' + b);

                        var self = this;

                        if (typeof setTimeout === 'function') {

                            setTimeout(function () {

                                try { self.dataLoadedCompleteAsync(name); } catch (e) {}

                            }, 0);

                        } else if (typeof self.dataLoadedCompleteAsync === 'function') {

                            self.dataLoadedCompleteAsync(name);

                        }

                        return;

                    }

                } catch (e) {}

                return ax.apply(this, arguments);

            };

        }



        if (typeof P.addExportJson === 'function') {

            var ae = P.addExportJson;

            P.addExportJson = function (name) {

                try {

                    var f = String(this.s_URL) + name + '/' + name + '.ExportJson';

                    if (name.indexOf('juqing') !== -1 || !exists(f)) {

                        say('SKIPPING MISSING JSON: ' + f);

                        var self = this;

                        if (typeof setTimeout === 'function') {

                            setTimeout(function () {

                                try { self.dataLoadedCompleteAsync(name); } catch (e) {}

                            }, 0);

                        } else if (typeof self.dataLoadedCompleteAsync === 'function') {

                            self.dataLoadedCompleteAsync(name);

                        }

                        return;

                    }

                } catch (e) {}

                return ae.apply(this, arguments);

            };

        }



        say('ArmatureLoad guards installed successfully');

    }



    install();

}());

(function installModernHomeUI() {
    var NH_MODERN_HOME = false;
    if (!NH_MODERN_HOME) return;
    if (typeof HomeScene === 'undefined' || typeof HomeMenu === 'undefined' || typeof UserInfor === 'undefined' ||
        !HomeScene.prototype || !HomeMenu.prototype || !UserInfor.prototype || HomeScene.prototype.__nhModern) return;

    var IMG = 'image/hl/';
    // ── SKALA ADAPTIF ── mockup dirancang untuk layar setinggi ~NH_REF_H piksel. K = tinggi layar sebenarnya / NH_REF_H.
    // Mau HUD lebih besar/kecil? ubah NH_UI_BOOST (1 = persis mockup, 1.15 = 15% lebih besar, dst).
    var NH_REF_H = 480, NH_UI_BOOST = 1.15;
    var K = 1;
    function calcK() {
        try { K = Math.max(1, GameTools.getInstance().sceneSize.height / NH_REF_H) * NH_UI_BOOST; } catch (e) { K = 1; }
        return K;
    }
    var OFF = cc.p(-99999, -99999);
    function font() { return (typeof pFont1 !== 'undefined' && pFont1) ? pFont1 : ((typeof pFont0 !== 'undefined' && pFont0) ? pFont0 : 'Arial'); }
    function spr(name, scale) {
        var s = cc.Sprite.create(IMG + name);
        if (s) s.setScale((scale == null ? 0.5 : scale) * K);
        return s;
    }
    function lbl(text, size, color, ax, ay) {
        var t = cc.LabelTTF.create(text, font(), size * K);
        t.setAnchorPoint(cc.p(ax == null ? 0.5 : ax, ay == null ? 0.5 : ay));
        t.setColor(color || cc.c3b(255, 255, 255));
        if (t.setHorizontalAlignment) t.setHorizontalAlignment(ax === 0 ? cc.TEXT_ALIGNMENT_LEFT : (ax === 1 ? cc.TEXT_ALIGNMENT_RIGHT : cc.TEXT_ALIGNMENT_CENTER));
        return t;
    }
    function fit(tf, maxW) {
        tf.setScale(1);
        var w = tf.getContentSize().width;
        if (w > maxW * K && w > 0) tf.setScale(maxW * K / w);
    }
    function setText(tf, s, maxW) {
        s = String(s);
        if (tf.__nhS === s) return;
        tf.__nhS = s; tf.setString(s); fit(tf, maxW);
    }
    function dots(s) { return String(s).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
    function click() { try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) { } }
    function ud() { return UserData.getInstance(); }
    function hideNode(n) { try { if (n && n.setOpacity) n.setOpacity(0); } catch (e) { } }

    // Pindahkan hit-area sebuah node supaya persis menutup kotak (w x h) bertitik tengah (cx, cy) di koordinat DUNIA.
    // Rumus hit GameTools.onTouchesHit: pos(parent->dunia) - size*anchor*scale (+/- _op). Hanya skala node itu sendiri dihitung.
    function ghost(node, cx, cy, w, h) {
        try {
            if (!node || !node.getParent()) return false;
            var cs = node.getContentSize();
            if (!cs.width || !cs.height) { node.setContentSize(cc.size(w, h)); cs = node.getContentSize(); }
            node._op = cc.p(0, 0);
            var sx = w / cs.width, sy = h / cs.height;
            node.setScaleX(sx); node.setScaleY(sy);
            var a = node.getAnchorPoint(), lp = node.getParent().convertToNodeSpace(cc.p(cx, cy));
            node.setPosition(cc.p(lp.x - (0.5 - a.x) * cs.width * sx, lp.y - (0.5 - a.y) * cs.height * sy));
            return true;
        } catch (e) { return false; }
    }

    // ───────────────────────── KIRI: HUD ─────────────────────────
    function buildLeft(scene) {
        calcK();
        var hud = scene.userInfor, root = hud.getParent();
        var size = GameTools.getInstance().sceneSize, H = size.height;
        function W(x, yTop) { return cc.p(x * K, H - yTop * K); }          // koordinat "satuan mockup" (kiri-atas) -> dunia
        var L = cc.Layer.create();
        root.addChild(L, 94);                                       // di bawah HUD lama (popup info tetap di atas)

        var cap = spr('hl_capsule.png'); cap.setAnchorPoint(cc.p(0, 0.5)); cap.setPosition(W(72, 27)); L.addChild(cap);
        var lvBadge = spr('hl_level.png'); lvBadge.setPosition(W(37, 35)); L.addChild(lvBadge);
        var lvTF = lbl('1', 20, cc.c3b(255, 255, 255)); lvTF.setPosition(W(37, 35)); L.addChild(lvTF, 2);
        var vipPill = spr('hl_vip.png'); vipPill.setPosition(W(37, 60)); L.addChild(vipPill, 3);
        var vipTF = lbl('VIP 0', 11, cc.c3b(70, 40, 10)); vipTF.setPosition(W(37, 60)); L.addChild(vipTF, 4);
        var cpPill = spr('hl_cp.png'); cpPill.setPosition(W(131, 58)); L.addChild(cpPill);
        var cpIc = spr('ic_cp.png', 0.4); cpIc.setPosition(W(88, 58)); L.addChild(cpIc, 2);
        var cpLab = lbl('CP', 10, cc.c3b(255, 222, 170), 0, 0.5); cpLab.setPosition(W(98, 58)); L.addChild(cpLab, 2);
        var cpTF = lbl('0', 13, cc.c3b(255, 226, 110), 0, 0.5); cpTF.setPosition(W(116, 58)); L.addChild(cpTF, 2);

        // tiga segmen kapsul: [kiri, kanan, ikon, teks-kiri, plus-x, tipe]
        var segs = [
            { l: 72, r: 185, ic: 'ic_coin.png', ix: 94, tx: 108, px: 165, mc: hud.goldMC },
            { l: 185, r: 280, ic: 'ic_gem.png', ix: 205, tx: 219, px: 259, mc: hud.silverMC },
            { l: 280, r: 410, ic: 'ic_flame.png', ix: 298, tx: 312, px: 387, mc: hud.energyMC }
        ];
        var i, s;
        for (i = 0; i < segs.length; i++) {
            s = segs[i];
            var ic = spr(s.ic); ic.setPosition(W(s.ix, 27)); L.addChild(ic, 2);
            var pl = spr('hl_plus.png'); pl.setPosition(W(s.px, 27)); L.addChild(pl, 2);
            s.tf = lbl('0', 12, cc.c3b(255, 255, 255), 0, 0.5); s.tf.setPosition(W(s.tx, 27)); L.addChild(s.tf, 2);
            s.maxW = s.px - 12 - s.tx;
        }
        // pill hitung-mundur stamina (cermin dari pill bawaan)
        var rg = spr('hl_regen.png'); rg.setScaleX(0.5 * K); rg.setScaleY(0.577 * K); rg.setPosition(W(476, 27)); L.addChild(rg); rg.setVisible(false);
        var rgIc = spr('ic_clock.png', 0.5); rgIc.setPosition(W(452, 27)); L.addChild(rgIc, 2); rgIc.setVisible(false);
        var rgTF = lbl('', 11, cc.c3b(255, 255, 255), 0.5, 0.5); rgTF.setPosition(W(488, 27)); L.addChild(rgTF, 2);
        // tombol bulat kecil (koleksi & discord)
        var colIc = spr('sm_col.png', 0.72); colIc.setPosition(W(91, 102)); L.addChild(colIc, 2);
        var disIc = spr('sm_chat.png', 0.72); disIc.setPosition(W(37, 102)); L.addChild(disIc, 2);

        var st = { L: L, hud: hud, W: W, lvTF: lvTF, vipTF: vipTF, cpTF: cpTF, segs: segs, rg: rg, rgIc: rgIc, rgTF: rgTF, disIc: disIc };
        hud.__nhModernHud = st;

        function ghostAll() {
            var j, g, mc, w, c, p;
            ghost(hud.inforBG, 37 * K, H - 35 * K, 50 * K, 50 * K);
            ghost(hud.vipNode, 37 * K, H - 60 * K, 62 * K, 20 * K);
            ghost(hud.tujianBtn, 91 * K, H - 102 * K, 44 * K, 44 * K);
            ghost(hud.fblike, 37 * K, H - 102 * K, 44 * K, 44 * K);
            for (j = 0; j < segs.length; j++) {
                g = segs[j]; mc = g.mc; if (!mc) continue;
                p = mc.toucheList || [mc.imgBg, mc.img];
                for (c = 0; c < p.length; c++) if (p[c]) ghost(p[c], (g.l + g.r) / 2 * K, H - 27 * K, (g.r - g.l) * K, 30 * K);
            }
            mc = hud.forceMC;
            if (mc) { p = mc.toucheList || [mc.imgBg, mc.img]; for (c = 0; c < p.length; c++) if (p[c]) ghost(p[c], 131 * K, H - 58 * K, 110 * K, 24 * K); }
        }
        function hideOld() {
            var j, mc, n;
            hideNode(hud.inforBG); hideNode(hud.tujianBtn); hideNode(hud.fblike);
            if (hud.lvNum) hud.lvNum.setVisible(false);
            if (hud.vipImg) hud.vipImg.setVisible(false);
            if (hud.viplvImg) hud.viplvImg.setVisible(false);
            var list = [hud.goldMC, hud.silverMC, hud.energyMC, hud.forceMC];
            for (j = 0; j < list.length; j++) {
                mc = list[j]; if (!mc) continue;
                var tl = mc.toucheList || [mc.imgBg, mc.img], q;
                for (q = 0; q < tl.length; q++) hideNode(tl[q]);
                if (mc.txtTF) mc.txtTF.setVisible(false);
            }
            if (hud.__nhEnergyPill) hud.__nhEnergyPill.setPosition(OFF);
        }
        st.ghostAll = ghostAll; st.hideOld = hideOld;

        function tick() {
            try {
                var u = ud(), k;
                setText(lvTF, u.lv, 40);
                setText(vipTF, 'VIP ' + (u.vipLv || 0), 52);
                for (k = 0; k < segs.length; k++) if (segs[k].mc && segs[k].mc.txtTF) setText(segs[k].tf, segs[k].mc.txtTF.getString(), segs[k].maxW);
                if (hud.forceMC && hud.forceMC.txtTF) setText(cpTF, dots(hud.forceMC.txtTF.getString()), 64);
                var on = !!(hud.__nhEnergyPill && hud.__nhEnergyTF && hud.__nhEnergyTF.getString() !== '');
                rg.setVisible(on); rgIc.setVisible(on);
                if (on) setText(rgTF, hud.__nhEnergyTF.getString(), 38); else rgTF.setString('');
                if (hud.__nhEnergyPill) hud.__nhEnergyPill.setPosition(OFF);
                disIc.setVisible(!hud.fblike || hud.fblike.isVisible());
                if (hud.viplvImg) hud.viplvImg.setVisible(false);
            } catch (e) { }
        }
        L.schedule(tick, 0.4);
        hideOld(); ghostAll(); tick();
        return st;
    }

    // ───────────────────────── KANAN: Leave Village + hamburger + panel Menu ─────────────────────────
    var ITEMS = [
        { key: 'duihuan', ic: 'ic_exchange.png', lab: 'Exchange', glow: 'duihuanGuang' },
        { key: 'jiangli', ic: 'ic_daily.png', lab: 'Daily Event', glow: 'jiangliGuang' },
        { key: 'redian', ic: 'ic_hot.png', lab: 'Hot Event', glow: 'redianGuang' },
        { key: 'email', ic: 'ic_mail.png', lab: 'Mail', glow: 'emailGuang' },
        { key: 'quest', ic: 'ic_quest.png', lab: 'Quest' },
        { key: 'RSYZ_btn', ic: 'ic_war.png', lab: 'Great Ninja\nWar' },
        { key: 'shangBtn', ic: 'ic_store.png', lab: 'Store' },
        { key: '@recharge', ic: 'ic_recharge.png', lab: 'Recharge', act: function () { ContentView.setPageView('buyGold'); } },
        // dipindah dari menu bawah -> grid (tombol aslinya disembunyikan oleh slimBar)
        { key: '@redeem', ic: 'ic_redeem.png', lab: 'Redeem', act: function () { PromptView.setPageView('cardCode'); } },
        { key: '@costume', ic: 'ic_costume.png', lab: 'Costume', act: function () { ContentView.setPageView('costume'); } },
        { key: '@friends', ic: 'ic_friends.png', lab: 'Friends', act: function () { ContentView.setPageView('haoyou'); } },
        { key: 'xuanshang', ic: 'ic_bounty.png', lab: 'Bounty', glow: 'xuanshangGuang', extra: true },
        { key: 'wsznBtn', ic: 'ic_beast.png', lab: 'Beast', extra: true }
    ];

    // ───────────────────────── MENU BAWAH: cabut Redeem / Costume / Friends, rapatkan sisanya ─────────────────────────
    function barRemoved(hm) { var c = hm.controller || {}; return [c.costume, c.haoyou, hm.nhRedeemBtn, hm.nhFightBtn]; }
    function keepBarHidden(hm) {
        var rem = barRemoved(hm), i;
        for (i = 0; i < rem.length; i++) if (rem[i]) { rem[i].setVisible(false); rem[i].setPosition(OFF); }
    }
    function slimBar(hm) {
        try {
            var tl = hm.touchList, pl = hm.posList;
            if (!tl || !pl || !pl.length) return;
            var slots = pl.slice(0).sort(function (a, b) { return b.x - a.x; });     // slot kanan -> kiri (sebelum dicabut)
            var rem = barRemoved(hm), i, idx, n;
            for (i = 0; i < rem.length; i++) {
                if (!rem[i]) continue;
                idx = tl.indexOf(rem[i]);
                if (idx >= 0 && idx < pl.length) { tl.splice(idx, 1); pl.splice(idx, 1); }
            }
            n = pl.length;
            var order = [];
            for (i = 0; i < n; i++) order.push({ i: i, x: pl[i].x });
            order.sort(function (a, b) { return b.x - a.x; });                      // sisa tombol, kanan -> kiri
            var np = [], opened = (typeof BuildData !== 'undefined' && BuildData.getInstance().menuStatus != 0);
            for (i = 0; i < n; i++) np[order[i].i] = slots[i];
            for (i = 0; i < n; i++) {
                pl[i] = np[i];
                if (opened && tl[i] && tl[i].isVisible()) tl[i].setPosition(np[i]);
            }
            keepBarHidden(hm);
        } catch (e) { }
    }

    function buildRight(scene, mode) {
        var hm = scene.homeMenu, up = hm.sceneUpMenu, c = up && up.controller;
        // di desa tombolnya 'adventure' (Leave Village); di peta tombolnya 'homeBtn' (Enter Village)
        var leaveKey = (mode === 'map') ? 'homeBtn' : 'adventure';
        if (!c || !c[leaveKey]) return null;
        calcK();
        var H = GameTools.getInstance().sceneSize.height;
        function T(fromRight, yTop) { return cc.p(-fromRight * K, H - yTop * K); }   // koordinat HomeMenu (x=0 di tepi kanan layar)
        var R = cc.Layer.create(); hm.addChild(R, 10);

        var leave = spr('hl_leave.png'); leave.setPosition(T(136.5, 32)); R.addChild(leave);
        var leaveTF = lbl(mode === 'map' ? 'Enter Village' : 'Leave Village', 13, cc.c3b(70, 40, 10)); leaveTF.setPosition(T(136.5, 32)); R.addChild(leaveTF, 1);
        var leaveDot = spr('hl_dot.png'); leaveDot.setPosition(T(80, 18)); R.addChild(leaveDot, 2); leaveDot.setVisible(false);

        var burger = spr('hl_burger.png'); burger.setPosition(T(42, 32)); R.addChild(burger, 2);
        burger._ty = 'nhBurger';
        var dot = spr('hl_dot.png'); dot.setPosition(T(26, 16)); R.addChild(dot, 3); dot.setVisible(false);

        var panel = cc.Node.create(); panel.setVisible(false); R.addChild(panel, 1);
        var bg2 = spr('hl_panel.png'), bg3 = spr('hl_panel3.png'), bg2w = spr('hl_panel2w.png'), bg3w = spr('hl_panel3w.png');
        var bgs = [bg2, bg3, bg2w, bg3w], bi;
        for (bi = 0; bi < bgs.length; bi++) { bgs[bi].setAnchorPoint(cc.p(1, 1)); bgs[bi].setPosition(T(20, 64)); panel.addChild(bgs[bi]); }
        var title = lbl('Menu', 14, cc.c3b(255, 200, 70), 0, 0.5); title.setPosition(T(326, 85)); panel.addChild(title, 2);

        var tiles = [], hitNodes = [burger], i, it;
        for (i = 0; i < ITEMS.length; i++) {
            it = ITEMS[i];
            var tile = spr('hl_tile.png'); panel.addChild(tile, 1);
            var icn = spr(it.ic); panel.addChild(icn, 2);
            var tf = lbl(it.lab, 12, cc.c3b(255, 255, 255)); panel.addChild(tf, 2);
            var td = spr('hl_dot.png'); panel.addChild(td, 3); td.setVisible(false);
            var isAt = it.key.charAt(0) === '@';
            var node = isAt ? tile : c[it.key];
            tiles.push({ it: it, tile: tile, icn: icn, tf: tf, dot: td, node: node, shown: false, isAt: isAt });
            if (isAt) { tile._ty = 'nhAct'; tile._nhAct = it.act; tile.setVisible(false); hitNodes.push(tile); }
        }
        var st = { hm: hm, up: up, c: c, R: R, panel: panel, bg2: bg2, bg3: bg3, burger: burger, dot: dot, leaveDot: leaveDot,
                   tiles: tiles, hitNodes: hitNodes, open: false, T: T, H: H };

        function layout() {
            var shown = [], k, t, row, col, cx, cy;
            for (k = 0; k < tiles.length; k++) {
                t = tiles[k]; t.shown = false;
                if (!t.node) continue;
                if (t.it.extra && !t.node.isVisible()) continue;
                shown.push(t);
            }
            var cols = shown.length > 8 ? 5 : 4, rows = Math.ceil(shown.length / cols);
            bg2.setVisible(cols === 4 && rows <= 2); bg3.setVisible(cols === 4 && rows > 2);
            bg2w.setVisible(cols === 5 && rows <= 2); bg3w.setVisible(cols === 5 && rows > 2);
            title.setPosition(T(326 + (cols - 4) * 76, 85));
            for (k = 0; k < tiles.length; k++) {
                t = tiles[k]; t.tile.setVisible(false); t.icn.setVisible(false); t.tf.setVisible(false);
                if (t.isAt) t.node.setVisible(false);
            }
            for (k = 0; k < shown.length; k++) {
                t = shown[k]; t.shown = true;
                row = Math.floor(k / cols); col = k % cols;
                cx = 296 + (cols - 4) * 76 - col * 76; cy = 149 + row * 96;            // jarak dari kanan / dari atas (satuan mockup)
                t.cx = cx; t.cy = cy;
                t.tile.setPosition(T(cx, cy)); t.tile.setVisible(true);
                t.icn.setPosition(T(cx, cy - 7)); t.icn.setVisible(true);
                t.tf.setPosition(T(cx, cy + (t.it.lab.indexOf('\n') >= 0 ? 22 : 27))); t.tf.setVisible(true);
                t.dot.setPosition(T(cx - 24, cy - 33));
            }
        }
        st.layout = layout;

        function placeGhosts(open) {
            var k, t, w;
            for (k = 0; k < tiles.length; k++) {
                t = tiles[k];
                if (!t.node || t.isAt) continue;
                if (open && t.shown) { w = hm.convertToWorldSpace(T(t.cx, t.cy)); ghost(t.node, w.x, w.y, 68 * K, 86 * K); }
                else t.node.setPosition(OFF);
            }
            if (!open) for (k = 0; k < tiles.length; k++) if (tiles[k].isAt) tiles[k].tile.setVisible(false);
            // Leave Village selalu aktif
            var lw = hm.convertToWorldSpace(T(136.5, 32));
            ghost(c[leaveKey], lw.x, lw.y, 123 * K, 40 * K);
        }
        st.setOpen = function (open) {
            st.open = open;
            if (open) layout();
            panel.setVisible(open);
            placeGhosts(open);
        };
        st.refreshBadges = function () {
            var k, t, any = false, g;
            for (k = 0; k < tiles.length; k++) {
                t = tiles[k]; g = t.it.glow ? c[t.it.glow] : null;
                var on = !!(g && g.isVisible());
                t.dot.setVisible(on && t.shown && st.open);
                if (on) any = true;
            }
            dot.setVisible(any && !st.open);
            leaveDot.setVisible(!!(c.gantanhao && c.gantanhao.isVisible()));
        };

        // daftarkan ke sistem sentuh HomeMenu (di akhir touchList; posList tidak perlu)
        hm.touchList = hm.touchList.concat(hitNodes);
        R.schedule(function () { try { st.refreshBadges(); keepBarHidden(hm); } catch (e) { } }, 0.3);

        up.setVisible(false);                                       // gambar lama disembunyikan; hit-area tetap
        st.setOpen(false);
        hm.__nhModern = st;
        slimBar(hm);
        return st;
    }

    // ───────────────────────── kait ke HomeScene / HomeMenu / UserInfor ─────────────────────────
    // bila HomeMenu.buildUI dijalankan ulang: pasang lagi hit-node grid & rapikan menu bawah
    var origBuildUI = HomeMenu.prototype.buildUI;
    if (typeof origBuildUI === 'function') HomeMenu.prototype.buildUI = function () {
        var r = origBuildUI.apply(this, arguments);
        try {
            var st = this.__nhModern;
            if (st && this.touchList) {
                var q;
                for (q = 0; q < st.hitNodes.length; q++) if (this.touchList.indexOf(st.hitNodes[q]) < 0) this.touchList.push(st.hitNodes[q]);
                slimBar(this);
            }
        } catch (e) { }
        return r;
    };

    var initUI = HomeScene.prototype.initUI;
    HomeScene.prototype.initUI = function () {
        var r = initUI.apply(this, arguments);
        try { if (this.userInfor && this.homeMenu) { buildLeft(this); } } catch (e) { }
        try { if (this.homeMenu) { buildRight(this); } } catch (e) { }
        return r;
    };
    HomeScene.prototype.__nhModern = true;

    // Layar PETA (AdventureScene) memakai HomeMenu yang sama tetapi dibuat lewat bindUI, bukan HomeScene.initUI,
    // jadi dulu tampil menu lama. Sekarang ikut dipasangi panel kanan modern (tombol \"Enter Village\" + hamburger).
    if (typeof AdventureScene !== 'undefined' && AdventureScene.prototype && !AdventureScene.prototype.__nhModernMap &&
        typeof AdventureScene.prototype.bindUI === 'function') {
        var advBind = AdventureScene.prototype.bindUI;
        AdventureScene.prototype.bindUI = function () {
            var r = advBind.apply(this, arguments);
            try { if (this.homeMenu) { buildRight(this, 'map'); } } catch (e) { }
            return r;
        };
        AdventureScene.prototype.__nhModernMap = true;
    }

    var te = HomeMenu.prototype.onTouchesEnded;
    HomeMenu.prototype.onTouchesEnded = function (touches) {
        var t = this.touchTarget, st = this.__nhModern, res = te.apply(this, arguments);
        try {
            if (st) {
                var hit = !!(t && t.isVisible() && GameTools.getInstance().onTouchesHit(touches[0], [t]) === t);
                if (t && t._ty === 'nhBurger' && hit) { click(); st.setOpen(!st.open); }
                else if (t && t._nhAct && hit) { click(); st.setOpen(false); try { t._nhAct(); } catch (e2) { } }
                else if (st.open) st.setOpen(false);
            }
        } catch (e) { }
        return res;
    };

    // VIP: gambar angka lama dibuat ulang tiap update -> sembunyikan lagi & pasang ulang hit-area
    var uv = UserInfor.prototype.updatVip;
    if (typeof uv === 'function') UserInfor.prototype.updatVip = function () {
        var r = uv.apply(this, arguments);
        try {
            var st = this.__nhModernHud;
            if (st) {
                if (this.vipImg) this.vipImg.setVisible(false);
                if (this.viplvImg) this.viplvImg.setVisible(false);
                ghost(this.vipNode, 37 * K, GameTools.getInstance().sceneSize.height - 60 * K, 62 * K, 20 * K);
            }
        } catch (e) { }
        return r;
    };
}());

// ====================================================================================================
// NH MODERN BOTTOM PILL - menu bawah baru (kapsul melayang, selalu tampil, tanpa tombol + / x)
//
//   * Isi menu: Ranking, Team, Deploy, Ninja, Lab, Forge, Warehouse, Clan (sama seperti yang ada di game).
//   * Fungsi TIDAK diubah: tombol lama tetap dipakai sebagai "hantu" (tidak terlihat, hanya hit-area dipindah
//     ke posisi ikon baru), jadi semua klik / level-lock / lencana bawaan tetap jalan.
//   * Tahan (sentuh) sebuah ikon -> muncul tooltip nama menu di atasnya.
//   * Gambar: image/hl/bm_*.png. Matikan seluruhnya dengan NH_MODERN_PILL = false.
// Sintaks ES5 saja (SpiderMonkey 22). Bila ada yang gagal, tampilan lama dibiarkan.
// ====================================================================================================
(function installModernBottomPill() {
    var NH_MODERN_PILL = false;
    if (!NH_MODERN_PILL) return;
    if (typeof HomeScene === 'undefined' || typeof HomeMenu === 'undefined' || !HomeScene.prototype || !HomeMenu.prototype ||
        HomeScene.prototype.__nhPill) return;

    var IMG = 'image/hl/';
    var NH_REF_H = 480, NH_UI_BOOST = 1.15, K = 1;
    function calcK() {
        try { K = Math.max(1, GameTools.getInstance().sceneSize.height / NH_REF_H) * NH_UI_BOOST; } catch (e) { K = 1; }
        return K;
    }
    var OFF = cc.p(-99999, -99999);
    function font() { return (typeof pFont1 !== 'undefined' && pFont1) ? pFont1 : ((typeof pFont0 !== 'undefined' && pFont0) ? pFont0 : 'Arial'); }

    // urutan kiri -> kanan
    var ITEMS = [
        { key: 'paihangbang', ic: 'bm_rank.png',   lab: 'Ranking' },
        { key: 'paibing',     ic: 'bm_team.png',   lab: 'Team' },
        { key: 'buzhen',      ic: 'bm_deploy.png', lab: 'Deploy' },
        { key: 'huoban',      ic: 'bm_ninja.png',  lab: 'Ninja' },
        { key: 'shiyanshi',   ic: 'bm_lab.png',    lab: 'Lab' },
        { key: 'duanzao',     ic: 'bm_forge.png',  lab: 'Forge', tip: 'duanzaoTip' },
        { key: 'beibao',      ic: 'bm_ware.png',   lab: 'Warehouse' },
        { key: 'juntuan',     ic: 'bm_clan.png',   lab: 'Clan' }
    ];
    // ukuran dalam "satuan mockup" (tinggi layar acuan 480): diameter ikon, jarak, padding, margin kanan/bawah, tinggi kapsul
    var D = 43, GAP = 9, PAD = 12, MR = 15, MB = 12, PH = 61;

    function B(fromRight, fromBottom) { return cc.p(-fromRight * K, fromBottom * K); }   // koordinat HomeMenu (x=0 di tepi kanan layar)

    // sama seperti ghost() di modul Modern Home: pindahkan hit-area node ke kotak (w x h) bertitik tengah (cx, cy) dunia
    function ghost(node, cx, cy, w, h) {
        try {
            if (!node || !node.getParent()) return false;
            var cs = node.getContentSize();
            if (!cs.width || !cs.height) { node.setContentSize(cc.size(w, h)); cs = node.getContentSize(); }
            node._op = cc.p(0, 0);
            var sx = w / cs.width, sy = h / cs.height;
            node.setScaleX(sx); node.setScaleY(sy);
            var a = node.getAnchorPoint(), lp = node.getParent().convertToNodeSpace(cc.p(cx, cy));
            node.setPosition(cc.p(lp.x - (0.5 - a.x) * cs.width * sx, lp.y - (0.5 - a.y) * cs.height * sy));
            return true;
        } catch (e) { return false; }
    }
    function sprite(name) { try { return cc.Sprite.create(IMG + name); } catch (e) { return null; } }

    function build(hm) {
        if (!hm || hm.__nhPill || !hm.controller || !hm.touchList) return null;
        calcK();
        var n = ITEMS.length, pw = n * D + (n - 1) * GAP + 2 * PAD, i, it, o;
        var bg = sprite('bm_pill.png');
        if (!bg) return null;                                        // aset tidak ada -> biarkan tampilan lama
        var R = cc.Layer.create(); hm.addChild(R, 9);
        bg.setScale(0.5 * K); bg.setPosition(B(MR + pw / 2, MB + PH / 2)); R.addChild(bg, 0);

        var st = { hm: hm, R: R, c: hm.controller, items: [], pressed: null };
        for (i = 0; i < n; i++) {
            it = ITEMS[i];
            o = { it: it, node: null, tipNode: null };
            o.pos = B(MR + PAD + D / 2 + (n - 1 - i) * (D + GAP), MB + PH / 2);
            o.icon = sprite(it.ic);
            if (!o.icon) return null;
            o.icon.setScale(0.5 * K); o.icon.setPosition(o.pos); R.addChild(o.icon, 2);
            o.dot = sprite('hl_dot.png');
            if (o.dot) { o.dot.setScale(0.5 * K); o.dot.setPosition(cc.p(o.pos.x + D * 0.32 * K, o.pos.y + D * 0.32 * K)); R.addChild(o.dot, 3); o.dot.setVisible(false); }
            st.items.push(o);
        }
        // tooltip
        st.tipBg = sprite('bm_tip.png');
        if (st.tipBg) {
            st.tipBg.setScale(0.5 * K); R.addChild(st.tipBg, 5); st.tipBg.setVisible(false);
            st.tipTF = cc.LabelTTF.create('', font(), 12 * K);
            st.tipTF.setColor(cc.c3b(30, 24, 40)); R.addChild(st.tipTF, 6); st.tipTF.setVisible(false);
        }

        st.bind = function (c) {
            var k, o2;
            st.c = c || st.c;
            for (k = 0; k < st.items.length; k++) {
                o2 = st.items[k];
                o2.node = st.c ? st.c[o2.it.key] : null;
                o2.tipNode = (st.c && o2.it.tip) ? st.c[o2.it.tip] : null;
            }
        };
        st.place = function () {
            var k, o2, w, idx, tl = hm.touchList, pl = hm.posList, c = st.c, j;
            calcK();
            for (k = 0; k < st.items.length; k++) {
                o2 = st.items[k]; if (!o2.node) continue;
                w = hm.convertToWorldSpace(o2.pos);
                ghost(o2.node, w.x, w.y, (D + 8) * K, (PH - 6) * K);
                try { o2.node.setOpacity(0); } catch (e1) { }
                try { if (o2.tipNode) o2.tipNode.setOpacity(0); } catch (e2) { }
                idx = tl ? tl.indexOf(o2.node) : -1;
                if (idx >= 0 && pl && idx < pl.length) pl[idx] = o2.node.getPosition();   // gotoPlay() tidak mengembalikan posisi lama
            }
            // tombol + / x lama: sembunyikan & jauhkan dari layar
            j = c ? c.jia : null;
            if (j) {
                try { j.setOpacity(0); j.setPosition(OFF); } catch (e3) { }
                idx = tl ? tl.indexOf(j) : -1;
                if (idx >= 0 && pl && idx < pl.length) pl[idx] = OFF;
            }
            try { if (c && c.act_jia) c.act_jia.setVisible(false); } catch (e4) { }
        };
        st.ensureOpen = function () {
            try {
                var bd = BuildData.getInstance();
                if (bd.menuStatus != 1) { bd.menuStatus = 1; }
                st.place();
                hm.gotoPlay(true);                                   // paksa kondisi "terbuka" tanpa animasi
                st.place();
            } catch (e) { }
        };
        st.refresh = function () {
            var k, o2, vis, col;
            for (k = 0; k < st.items.length; k++) {
                o2 = st.items[k]; if (!o2.node) continue;
                try {
                    vis = o2.node.isVisible();
                    o2.icon.setVisible(vis);
                    col = o2.node.getColor(); if (col) o2.icon.setColor(col);   // abu-abu bila level belum cukup
                    if (o2.dot) o2.dot.setVisible(!!(vis && o2.tipNode && o2.tipNode.isVisible()));
                } catch (e) { }
            }
        };
        st.setPressed = function (node) {
            var k, o2, on, any = null;
            st.pressed = node || null;
            for (k = 0; k < st.items.length; k++) {
                o2 = st.items[k]; on = !!(node && o2.node === node);
                o2.icon.setScale(0.5 * K * (on ? 1.12 : 1));
                if (on) any = o2;
            }
            if (st.tipBg) {
                if (any) {
                    st.tipTF.setString(any.it.lab);
                    var tw = st.tipTF.getContentSize().width, maxW = 66 * K;
                    st.tipTF.setScale(tw > maxW && tw > 0 ? maxW / tw : 1);
                    st.tipBg.setPosition(cc.p(any.pos.x, any.pos.y + (D / 2 + 22) * K));
                    st.tipTF.setPosition(cc.p(any.pos.x, any.pos.y + (D / 2 + 22 + 3.5) * K));
                }
                st.tipBg.setVisible(!!any); st.tipTF.setVisible(!!any);
            }
        };

        hm.__nhPill = st;
        st.bind(hm.controller);
        st.ensureOpen();
        st.refresh();
        R.schedule(function () { try { st.ensureOpen(); st.refresh(); } catch (e) { } }, 0.3);
        return st;
    }

    // bila HomeMenu.buildUI dijalankan ulang, node lama diganti baru -> sambungkan ulang
    var origBuildUI = HomeMenu.prototype.buildUI;
    if (typeof origBuildUI === 'function') HomeMenu.prototype.buildUI = function () {
        var r = origBuildUI.apply(this, arguments);
        try { var st = this.__nhPill; if (st) { st.bind(this.controller); st.ensureOpen(); st.refresh(); } } catch (e) { }
        return r;
    };

    var initUI = HomeScene.prototype.initUI;
    HomeScene.prototype.initUI = function () {
        var r = initUI.apply(this, arguments);
        try { if (this.homeMenu) build(this.homeMenu); } catch (e) { }
        return r;
    };
    HomeScene.prototype.__nhPill = true;

    // Kapsul bawah di layar PETA (AdventureScene.bindUI)
    if (typeof AdventureScene !== 'undefined' && AdventureScene.prototype && !AdventureScene.prototype.__nhPillMap &&
        typeof AdventureScene.prototype.bindUI === 'function') {
        var advBind2 = AdventureScene.prototype.bindUI;
        AdventureScene.prototype.bindUI = function () {
            var r = advBind2.apply(this, arguments);
            try { if (this.homeMenu) build(this.homeMenu); } catch (e) { }
            return r;
        };
        AdventureScene.prototype.__nhPillMap = true;
    }

    // FIX CHAT HILANG: kapsul memaksa BuildData.menuStatus = 1 (\"menu terbuka\") + hm.gotoPlay(true) setiap 0,3 dtk.
    // Bawaan game: saat menu bawah terbuka, HomeScene.onShowMenu(1) menggeser kotak chat keluar layar.
    // Karena kapsul selalu 'terbuka', chat selalu terdorong keluar. Di sini chat dipaksa tetap tampil.
    if (typeof HomeScene.prototype.onShowMenu === 'function' && !HomeScene.prototype.__nhKeepChat) {
        var origShowMenu = HomeScene.prototype.onShowMenu;
        HomeScene.prototype.onShowMenu = function (status, animate) {
            try {
                var cb = this.chatBoxLayer;
                if (cb && cb.isVisible() && cb.getPosition().y === 0) return;   // sudah tampil -> jangan ganggu animasinya
            } catch (e) { }
            return origShowMenu.call(this, 0, false);                           // status 0 = menu tertutup -> chat tampil
        };
        HomeScene.prototype.__nhKeepChat = true;
    }

    // tooltip saat ikon ditahan
    var tb = HomeMenu.prototype.onTouchesBegan;
    HomeMenu.prototype.onTouchesBegan = function (touches) {
        var res = tb.apply(this, arguments);
        try {
            var st = this.__nhPill;
            if (st) {
                var nodes = [], k;
                for (k = 0; k < st.items.length; k++) if (st.items[k].node) nodes.push(st.items[k].node);
                st.setPressed(GameTools.getInstance().onTouchesHit(touches[0], nodes) || null);
            }
        } catch (e) { }
        return res;
    };
    var te2 = HomeMenu.prototype.onTouchesEnded;
    HomeMenu.prototype.onTouchesEnded = function (touches) {
        var res = te2.apply(this, arguments);
        try { var st = this.__nhPill; if (st) st.setPressed(null); } catch (e) { }
        return res;
    };
}());

// ====================================================================================================
// NH LIVING BACKGROUND - background desa "hidup" (tema serangan Juubi)
//
//   * Gelombang tentakel : bagian atas gambar (langit + tentakel) dipotong jadi strip horizontal tipis, tiap strip
//                          digeser kiri-kanan dengan gelombang sinus -> tentakel tampak meliuk. Makin ke atas makin besar.
//   * Denyut mata        : salinan mata merah & mata putih membesar sambil memudar (riak) bergantian.
//   * Petir              : kilatan langit + dua petir menyala acak tiap beberapa detik.
//   * Bara api           : titik-titik oranye melayang naik pelan.
//   * Semua efek menjadi anak dari sprite background (HomeScene.renzheshan), jadi ikut bergeser saat desa di-scroll.
//   * Fungsi game TIDAK diubah. Matikan seluruhnya dengan NH_LIVING_BG = false, atau per-efek lewat flag di bawah.
// Sintaks ES5 saja (SpiderMonkey 22). Bila ada yang gagal, background statis dibiarkan.
// ====================================================================================================
(function installLivingBackground() {
    var NH_LIVING_BG = true;
    if (!NH_LIVING_BG) return;
    if (typeof HomeScene === 'undefined' || !HomeScene.prototype || typeof HomeScene.prototype.createBg !== 'function' ||
        HomeScene.prototype.__nhLiveBg) return;

    // ---- pengaturan ----
    var FX_WAVE = true,  WAVE_AMP = 10,  WAVE_SPEED = 1.0;   // tentakel meliuk (AMP = piksel gambar, SPEED = kecepatan)
    var FX_EYES = true;                                       // denyut mata
    var FX_LIGHTNING = true;                                  // petir
    var FX_EMBERS = true, EMBER_COUNT = 26;                   // bara api

    // ---- geometri gambar renzheshang.png di atlas ibgicon (diukur dari file) ----
    var AX = 1, AY = 1, AW = 1700, AH = 720;      // kotak gambar di atlas
    var WAVE_H = 470, STRIP = 8;                  // area yang digelombang (baris dari atas) & tinggi strip
    var SKY_H = 500;                              // batas bawah langit (di bawahnya siluet rumah)
    var EYE_RED = { x: 706, y: 145, r: 100 };     // pusat mata merah (x, y dari atas)
    var EYE_WHITE = { x: 1117, y: 202, r: 66 };   // pusat mata putih
    var BOLT_L = { x: 205, y: 0, w: 140, h: 290 };
    var BOLT_R = { x: 1400, y: 0, w: 160, h: 290 };

    function now() { return (new Date()).getTime() / 1000; }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    function clipSprite(tex, x, yTop, w, h, cs) {
        var s = cc.Sprite.createWithTexture(tex, cc.rect(AX + x, AY + yTop, w, h));
        if (!s) return null;
        s.setAnchorPoint(cc.p(0, 0));
        s.setPosition(cc.p(x, cs.height - yTop - h));
        return s;
    }
    function additive(node) { try { node.setBlendFunc(gl.SRC_ALPHA, gl.ONE); } catch (e) { } }

    function build(bg) {
        if (!bg || bg.__nhLive || !bg.getTexture) return;
        var tex = bg.getTexture(), cs = bg.getContentSize();
        if (!tex || !cs || cs.width < 1000 || cs.height < 500) return;   // bukan gambar yang diharapkan -> jangan diutak-atik
        var fx = cc.Node.create();
        bg.addChild(fx, 1);
        bg.__nhLive = fx;

        var strips = [], eyes = [], embers = [], i, s, y;

        // 1) tentakel meliuk
        if (FX_WAVE) {
            for (y = 0; y < WAVE_H; y += STRIP) {
                var h = Math.min(STRIP + 1, AH - y);                      // +1 piksel tumpang tindih supaya tidak ada celah
                s = clipSprite(tex, 0, y, AW, h, cs);
                if (!s) { strips = []; break; }
                fx.addChild(s, 0);
                strips.push({ n: s, y: y, w: Math.pow(Math.max(0, 1 - y / WAVE_H), 1.1) });
            }
        }

        // 2) denyut mata (riak): salinan mata dibesarkan sambil memudar
        if (FX_EYES) {
            var defs = [EYE_RED, EYE_WHITE], d, e;
            for (i = 0; i < defs.length; i++) {
                d = defs[i];
                e = clipSprite(tex, d.x - d.r, d.y - d.r, d.r * 2, d.r * 2, cs);
                if (!e) continue;
                e.setAnchorPoint(cc.p(0.5, 0.5));
                e.setPosition(cc.p(d.x, cs.height - d.y));
                e.setOpacity(0);
                fx.addChild(e, 2);
                eyes.push({ n: e, phase: i * 1.7, period: 2.6 + i * 0.5 });
            }
        }

        // 3) petir
        var flash = null, boltL = null, boltR = null;
        if (FX_LIGHTNING) {
            flash = cc.LayerColor.create(cc.c4b(170, 120, 230, 0), AW, SKY_H);
            flash.setPosition(cc.p(0, cs.height - SKY_H));
            additive(flash); fx.addChild(flash, 3);
            boltL = clipSprite(tex, BOLT_L.x, BOLT_L.y, BOLT_L.w, BOLT_L.h, cs);
            boltR = clipSprite(tex, BOLT_R.x, BOLT_R.y, BOLT_R.w, BOLT_R.h, cs);
            if (boltL) { boltL.setOpacity(0); additive(boltL); fx.addChild(boltL, 4); }
            if (boltR) { boltR.setOpacity(0); additive(boltR); fx.addChild(boltR, 4); }
        }
        var strike = { until: 0, nextAt: now() + rnd(2, 5), pattern: [], t0: 0, which: 0 };

        // 4) bara api
        if (FX_EMBERS) {
            for (i = 0; i < EMBER_COUNT; i++) {
                var sz = rnd(2, 4), em = cc.LayerColor.create(cc.c4b(255, rnd(140, 190), 60, 255), sz, sz);
                em.setOpacity(rnd(110, 230));
                fx.addChild(em, 5);
                embers.push({ n: em, x: rnd(0, AW), y: rnd(0, SKY_H), vy: rnd(12, 34), ph: rnd(0, 6.28), sw: rnd(8, 26) });
            }
        }

        var t = 0, last = now();
        fx.schedule(function () {
            try {
                var tn = now(), dt = Math.min(0.1, tn - last), k;
                last = tn; t += dt;

                for (k = 0; k < strips.length; k++) {
                    var st = strips[k];
                    st.n.setPositionX(WAVE_AMP * st.w * (Math.sin(t * 1.4 * WAVE_SPEED + st.y * 0.017) +
                                                        0.5 * Math.sin(t * 2.3 * WAVE_SPEED + st.y * 0.041)));
                }

                for (k = 0; k < eyes.length; k++) {
                    var ey = eyes[k], p = ((t + ey.phase) % ey.period) / ey.period;      // 0..1
                    ey.n.setScale(1 + 0.22 * p);
                    ey.n.setOpacity(Math.max(0, Math.round(150 * Math.sin(p * Math.PI) * (1 - p * 0.3))));
                }

                if (flash) {
                    if (tn >= strike.nextAt && !strike.pattern.length) {
                        strike.pattern = [1, 0.2, 0.85, 0, 0.55, 0.15, 0];                 // kilatan beruntun
                        strike.t0 = tn; strike.which = Math.random() < 0.5 ? 0 : 1;
                        strike.nextAt = tn + rnd(3, 8);
                    }
                    var lv = 0;
                    if (strike.pattern.length) {
                        var idx = Math.floor((tn - strike.t0) / 0.07);
                        if (idx >= strike.pattern.length) strike.pattern = []; else lv = strike.pattern[idx];
                    }
                    flash.setOpacity(Math.round(95 * lv));
                    var b = strike.which === 0 ? boltL : boltR, o = strike.which === 0 ? boltR : boltL;
                    if (b) b.setOpacity(Math.round(230 * lv));
                    if (o) o.setOpacity(0);
                }

                for (k = 0; k < embers.length; k++) {
                    var m = embers[k];
                    m.y += m.vy * dt;
                    if (m.y > SKY_H) { m.y = rnd(40, 160); m.x = rnd(0, AW); }
                    m.n.setPosition(cc.p(m.x + Math.sin(t * 0.8 + m.ph) * m.sw, cs.height - m.y));
                }
            } catch (e) { }
        }, 1 / 30);
    }

    var origCreateBg = HomeScene.prototype.createBg;
    HomeScene.prototype.createBg = function () {
        var r = origCreateBg.apply(this, arguments);
        try { build(this.renzheshan); } catch (e) { }
        return r;
    };
    HomeScene.prototype.__nhLiveBg = true;
}());





// ═════════════════════════════════════════════════════════════════
// NH PROFILE PANEL — layar penuh saat badge level (mis. "150") diklik
//
//   • Mengganti popup kecil lama (nama / Level / EXP / tombol Settings) dengan layar penuh bergaya
//     dialog navy + emas (mirip contoh "Redeem Code").
//   • Tab "Info"    : nama, VIP, level, bar EXP, Gold / Silver / Stamina / Combat Power / ID.
//   • Tab "Settings": Voice, Change Account, 4 notifikasi, Rare Ninja Popup, Redeem Code (semua di UI baru).
//   • Logika lama tidak dihapus: panel hanya membaca data HUD/UserData dan memanggil jendela bawaan.
//   • Gambar: image/hl/pf_*.png.  Matikan seluruhnya dengan NH_PROFILE_PANEL = false.
// Sintaks ES5 saja (SpiderMonkey 22). Bila ada yang gagal, popup lama tetap dipakai.
// ═════════════════════════════════════════════════════════════════
(function installProfilePanel() {
    var NH_PROFILE_PANEL = true;
    if (!NH_PROFILE_PANEL) return;
    if (typeof UserInfor === 'undefined' || !UserInfor.prototype || UserInfor.prototype.__nhProfilePanel) return;
    if (typeof UserInfor.prototype.onTouchesEnded !== 'function') return;

    var IMG = 'image/hl/';
    var Z_PANEL = 9000;
    var GOLD = cc.c3b(255, 214, 100), CREAM = cc.c3b(255, 244, 214), WHITE = cc.c3b(255, 255, 255),
        GREY = cc.c3b(160, 176, 214), DARKBR = cc.c3b(70, 40, 10);
    var panel = null, tab = 'info', hudRef = null, picking = false, pickPage = 0;
    // Foto profil = kepala ninja bawaan game. Pilihan disimpan HANYA di perangkat ini (localStorage), tidak dikirim ke server.
    var AVATAR_KEY = 'nh_avatar_v1';
    var HEADS = ["afei","ai","amado","anbu1","anbu2","aocyborgmode","aomoyi","ashuraotsusuki","asima","bai","ban","banzang","baryonnaruto","bawei","bingzuleitong","boren","boro","boruto","borutotimeskip","buzhihuoxuanjian","byakugankaguya","celestialmonk","changshilang","chinobasemode","chitongkai","chocoakimichi","chojuromizukage","chozaakimichi","chuanmu","chutian","cilangfang","code","codenolimiter","cyberotsutsuki","daemon","dahe","daitu","daluyi","darkmoonemperor","dashedou","dashewan","dayemu","demonravenking","denkikaminarimon","deruta","didala","dingci","dou","duoyouye","eida","erdaishuiying","erweirenzhuli","feiduan","feijian","fengyingwoailuo","forestguardian","frozenempress","fukasaku","gaarashinobicommander","gangshou","garajinchuriki","garo","guijiao","guitongwan","guoxinjushi","guren","hamuraotsutsuki","hanabihyuga","hashiramasagemode","hidan","hidarishinju","hikariuchiha","himawaritimeskip","himawariuzumaki","hinatauzumaki","hiruzensarutobiwarmode","hongdou","huibisi","huiye","humancloning","indraotsusuki","infernalshogun","itachiedotensei","jianmeicheng","jiaodu","jigen","jigenkarmamode","jingye","jingyin","jinjiao","jirobocursed","jiuwei","jiuweimingren","jue","junmalv","jurashinju","kai","kaibamen","kakashidoublesharingan","kakashihokage","kakaxi","kakuzu4heart","kanjiulang","karuyi","kawakikarma","kidomarucursed","kimimarocursed","kisameshark","konanangel","konohamarusarutobi","kurotsuchi","kushinauzumaki","liudaoban","liudaodaitu","liuweirenzhuli","luwan","madarasusanoo","madarauchihasusanoomode","magicalidol","maji","mamushishinju","mangekyousarada","matsurishinju","mechabaryonnaruto","mechauchihasasuke","menmauzumaki","merz","metallee","mightduy","minatokyuubi","mingren","mingrenzhonglizi","mitsuki","mitsukitimeskip","muyeshaobing","muyeshouwei","muyewan","nagatoedotensei","nanashiuchiha","narutoashuramode","narutohokage","narutokyuubimode","neoninjastreetwear","ningci","nobody","otsutsukihagoromo","otsutsukikinshiki","otsutsukimomoshiki","otsutsukiurashiki","paintendo","peien","primehagoromo","primekaguya","primelsshiki","primesakura","qiandaipopo","qilabi","qing","qiweirenzhuli","quanzhongya","retokazekage","ryushinju","sagejiraiya","sageofspacetime","sagesakura","sakedeng","sakonukoncursed","sakumohatake","sandaihuoying","sandaileiying","sanweirenzhuli","sasukeakatsuki","sasukeindramode","sasukewanderer","shadowrogue","shanchengqingye","shayinshaobing","shayinshouwei","shenzuo","shikadainara","shikakunara","shikamaruhokage","shinki","shisuiuchiha","shouju","shuimen","shuimu","shuiyue","sidaifengying","siweirenzhuli","siyue","stormrider","sumirekakei","summerhinata","summerkonan","summersakura","summertsunade","taoshi","tayuyacursed","tentailsmadara","tentailsobito","thelastsasuke","tiantian","tobiramaedotensei","toneri","toneritenseigan","tsunadesage","tuanzang","tuosizhen","uchihashin","urashikikarma","uzumakiashina","victor","wanhuatongzuozhu","whitemaskobito","woailuo","wu","wuweirenzhuli","wuyinshaobing","wuyinshouwei","xianglin","xianrenmingren","xiaoli","xiaonan","xiaoying","xie","xirihong","yibixi","yiluka","yinjiao","yishi","yiwei","yiweishouhe","you","yueguangjifeng","yushouxihongdou","zaibuzhan","zhaomeiming","zhinai","zhongwu","zhouyinzuozhu","zhujian","zilaiye","zuojing","zuojinyoujin","zuoliangna","zuozhu","zuozhulunhuiyan"];
    function getAvatar() {
        try { var v = sys.localStorage.getItem(AVATAR_KEY); if (v && HEADS.indexOf(String(v)) >= 0) return String(v); } catch (e) { }
        return null;
    }
    function setAvatar(name) { try { sys.localStorage.setItem(AVATAR_KEY, name || ''); } catch (e) { } }
    function headSpr(name) { try { return cc.Sprite.create('image/iroleHead/' + name + '_h.png'); } catch (e) { return null; } }

    function dir() { return cc.Director.getInstance(); }
    function WS() { return dir().getWinSize(); }
    function scene() { try { return dir().getRunningScene(); } catch (e) { return null; } }
    function click() { try { AudioEngine.getInstance().playerEffectSound('click'); } catch (e) { } }
    function font() { return (typeof pFont1 !== 'undefined' && pFont1) ? pFont1 : ((typeof pFont0 !== 'undefined' && pFont0) ? pFont0 : 'Arial'); }
    function spr(file) { try { return cc.Sprite.create(IMG + file); } catch (e) { return null; } }
    function dots(s) { return String(s).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
    function box(r, g, b, a, w, h, x, y) { var n = cc.LayerColor.create(cc.c4b(r, g, b, a), w, h); n.setPosition(cc.p(x, y)); return n; }
    function lbl(text, size, color, x, y, ax, ay, maxW) {
        var t = cc.LabelTTF.create(String(text), font(), size);
        t.setAnchorPoint(cc.p(ax == null ? 0.5 : ax, ay == null ? 0.5 : ay));
        t.setColor(color || WHITE);
        t.setPosition(cc.p(x, y));
        if (maxW) { var w = t.getContentSize().width; if (w > maxW && w > 0) t.setScale(maxW / w); }
        return t;
    }
    function wrapLbl(text, size, color, x, y, w, ax) {       // teks 2 baris, rata kiri, tengah vertikal di y
        var t = cc.LabelTTF.create(String(text), font(), size, cc.size(w, size * 3), cc.TEXT_ALIGNMENT_LEFT);
        t.setAnchorPoint(cc.p(ax == null ? 0 : ax, 0.5));
        t.setColor(color || WHITE);
        try { t.setVerticalAlignment(cc.VERTICAL_TEXT_ALIGNMENT_CENTER); } catch (e) { }
        t.setPosition(cc.p(x, y));
        return t;
    }
    function fitTo(s, w, h) { var c = s.getContentSize(); if (c.width > 0 && c.height > 0) { s.setScaleX(w / c.width); s.setScaleY(h / c.height); } }

    // ── data ──
    function hudText(mc) { try { return (mc && mc.txtTF) ? String(mc.txtTF.getString()) : '-'; } catch (e) { return '-'; } }
    function nextExp(lv) {
        try {
            var list = Config.getInstance().levelList, i;
            for (i in list) if (Object.prototype.hasOwnProperty.call(list, i) && Number(list[i].lv) === lv + 1) return Number(list[i].exp) || 0;
        } catch (e) { }
        return 0;
    }
    function info() {
        var u = UserData.getInstance(), lv = Number(u.lv) || 1, exp = Number(u.exp) || 0, need = nextExp(lv);
        return { name: String(u.name || 'Ninja'), id: u.id != null ? u.id : '-', lv: lv, exp: exp, need: need, vip: Number(u.vipLv) || 0 };
    }

    // ── layar penuh ──
    function newLayer() {
        var sz = WS(), L = cc.LayerColor.create(cc.c4b(0, 4, 20, 160), sz.width, sz.height);
        L.btns = [];
        try { L.setTouchMode(cc.TOUCH_ONE_BY_ONE); } catch (e) { }
        try { L.setTouchEnabled(true); } catch (e) { }
        L.onTouchBegan = function () { return true; };
        L.onTouchMoved = function () { };
        L.onTouchEnded = function (t) {
            var p = t.getLocation(), i, b;
            for (i = L.btns.length - 1; i >= 0; i--) {
                b = L.btns[i];
                if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { click(); b.fn(); return; }
            }
        };
        return L;
    }
    function clear(L) { try { L.removeAllChildren(true); } catch (e) { try { L.removeAllChildrenWithCleanup(true); } catch (e2) { } } L.btns = []; }
    function closePanel() {
        var p = panel; panel = null;
        if (p) { try { p.setTouchEnabled(false); } catch (e) { } try { p.removeFromParent(true); } catch (e2) { try { p.removeFromParentAndCleanup(true); } catch (e3) { } } }
    }
    function openThen(fn) { closePanel(); try { fn(); } catch (e) { } }

    function border(L, x, y, w, h, t, r, g, b, a, z) {
        L.addChild(box(r, g, b, a, w, t, x, y), z); L.addChild(box(r, g, b, a, w, t, x, y + h - t), z);
        L.addChild(box(r, g, b, a, t, h, x, y), z); L.addChild(box(r, g, b, a, t, h, x + w - t, y), z);
    }
    function card(L, x, y, w, h, k, z) {
        L.addChild(box(8, 20, 58, 235, w, h, x, y), z);
        border(L, x, y, w, h, Math.max(1, Math.round(1.5 * k)), 214, 170, 70, 210, z + 1);
    }
    function button(L, text, cx, cy, w, h, gold, fn, size) {
        var s = spr(gold ? 'pf_btn_gold.png' : 'pf_btn_navy.png');
        if (s) { fitTo(s, w, h); s.setPosition(cc.p(cx, cy)); L.addChild(s, 20); }
        L.addChild(lbl(text, size, gold ? DARKBR : CREAM, cx, cy, 0.5, 0.5, w - 16), 21);
        L.btns.push({ x: cx - w / 2, y: cy - h / 2, w: w, h: h, fn: fn });
    }

    // ── isi tab Settings (logika sama dengan layar lama SetUpScene) ──
    var NOTICE_TEXT = ['Anger of the Tailed Beast Notice', 'Stamina full recovery notice', 'Claim Stamina at 12:00 and 18:00', 'Forge cooldown end notice'];
    function noticeLabel(i) {
        try { var o = Config.getInstance().textObject, t = o && o[3150 + i]; if (t) return String(typeof t === 'object' ? (t.text || NOTICE_TEXT[i]) : t); } catch (e) { }
        return NOTICE_TEXT[i];
    }
    function noticeOn(i) { try { return !!NoticeDataCtl.getInstance().getNoticeStatus(i); } catch (e) { return false; } }
    function soundOn() { try { var a = AudioEngine.getInstance(); return a ? !a.getBgSound() : true; } catch (e) { return true; } }
    function recruitState() { try { return (typeof GameConnection !== 'undefined' && GameConnection.__nhGetRecruitPopup) ? !!GameConnection.__nhGetRecruitPopup() : null; } catch (e) { return null; } }
    var loginTarget = {
        onTip_Login: function () {                         // sama persis dengan SetUpScene.onTip_Login
            try { CostumeData.getInstance().reset(); } catch (e) { }
            MainView.setPageView('login', { switchAccount: true });
            try { if (accountUtil.getAccountType() == 'FACEBOOK') channelBinding.logoutFacebook(); } catch (e2) { }
            try { if (accountUtil.getAccountType() == 'GOOGLE') channelBinding.logoutGoogle(); } catch (e3) { }
        }
    };
    // ── filter notifikasi tarikan pemain lain (dibaca oleh render() notifikasi rekrutmen di adapter) ──
    var FILTER_KEY = 'nh_pull_filter_v1';
    function pullFilter() {
        var f = GameConnection.__nhPullFilter;
        if (f) return f;
        f = { ranks: { UR: false, SSS: false, SS: false }, gacha: false, box: false };
        try {
            var raw = sys.localStorage.getItem(FILTER_KEY), o = raw ? JSON.parse(raw) : null;
            if (o && o.ranks) { f.ranks.UR = !!o.ranks.UR; f.ranks.SSS = !!o.ranks.SSS; f.ranks.SS = !!o.ranks.SS; f.gacha = !!o.gacha; f.box = !!o.box; }
        } catch (e) { }
        GameConnection.__nhPullFilter = f;
        return f;
    }
    function savePullFilter() { try { sys.localStorage.setItem(FILTER_KEY, JSON.stringify(pullFilter())); } catch (e) { } }
    function pullRows() {
        var f = pullFilter(), rows = [], rp = recruitState();
        if (rp !== null) rows.push({ t: 'Show Pull Popup', toggle: true, on: rp,
            fn: function () { try { GameConnection.__nhSetRecruitPopup(!recruitState()); } catch (e) { } render(); } });
        function hideRow(text, get, set) { rows.push({ t: text, toggle: true, on: get(), fn: function () { set(!get()); savePullFilter(); render(); } }); }
        hideRow('Hide UR pulls', function () { return f.ranks.UR; }, function (v) { f.ranks.UR = v; });
        hideRow('Hide SSS pulls', function () { return f.ranks.SSS; }, function (v) { f.ranks.SSS = v; });
        hideRow('Hide SS pulls', function () { return f.ranks.SS; }, function (v) { f.ranks.SS = v; });
        hideRow('Hide Gacha pulls', function () { return f.gacha; }, function (v) { f.gacha = v; });
        hideRow('Hide Box pulls', function () { return f.box; }, function (v) { f.box = v; });
        return rows;
    }
    function settingRows() {
        return [
            { t: 'Voice', toggle: true, on: soundOn(),
              fn: function () {
                  try {
                      var a = AudioEngine.getInstance();
                      if (a) {
                          var currentlyMuted = !!a.getBgSound();
                          a.sendBgSound(!currentlyMuted);
                      }
                  } catch (e) { }
                  render();
              } },
            { t: 'Change Account', btn: 'Switch',
              fn: function () { openThen(function () { PromptView.setPageView('tip', { tid: 1047, target: loginTarget, fun: 'onTip_Login', closeBoon: true, cancelBoon: true }); }); } },
            { t: 'Redeem Code', btn: 'Open',
              fn: function () { openThen(function () { PromptView.setPageView('cardCode'); }); } }
        ];
    }
    function noticeRows() {
        var rows = [], i;
        for (i = 0; i < 4; i++) (function (n) {
            rows.push({ t: noticeLabel(n), toggle: true, on: noticeOn(n),
                fn: function () { try { NoticeDataCtl.getInstance().switchNotice(n); } catch (e) { } render(); } });
        })(i);
        return rows;
    }
    function signature() { return [tab, picking, pickPage, getAvatar(), soundOn(), noticeOn(0), noticeOn(1), noticeOn(2), noticeOn(3), recruitState(), JSON.stringify(pullFilter())].join('|'); }

    // ── pemilih foto profil (kepala ninja) ──
    function renderPicker(L, rx, rw, top, bot, k, lcx) {
        var cur = getAvatar(), i, s, cell = 50 * k, gap = 8 * k, btnH = 46 * k;
        L.addChild(lbl('Choose Profile Picture', 20 * k, CREAM, rx + 4 * k, top - 16 * k, 0, 0.5, rw - 8 * k), 7);
        var gTop = top - 40 * k, ctrlH = 38 * k, gBot = bot + btnH + 14 * k + ctrlH + 6 * k;
        var cols = Math.max(1, Math.floor((rw + gap) / (cell + gap))), rows = Math.max(1, Math.floor((gTop - gBot + gap) / (cell + gap)));
        var per = cols * rows, pages = Math.max(1, Math.ceil(HEADS.length / per));
        if (pickPage >= pages) pickPage = pages - 1; if (pickPage < 0) pickPage = 0;
        var gw = cols * cell + (cols - 1) * gap, gx0 = rx + (rw - gw) / 2;
        for (i = 0; i < per; i++) {
            var idx = pickPage * per + i; if (idx >= HEADS.length) break;
            (function (name) {
                var c = i % cols, r = Math.floor(i / cols), x = gx0 + c * (cell + gap), y = gTop - (r + 1) * cell - r * gap;
                L.addChild(box(12, 30, 84, 255, cell, cell, x, y), 4);
                var h = headSpr(name);
                if (h) { var cs = h.getContentSize(); h.setScale(cell / Math.max(1, cs.width)); h.setPosition(cc.p(x + cell / 2, y + cell / 2)); L.addChild(h, 5); }
                if (name === cur) border(L, x - 2 * k, y - 2 * k, cell + 4 * k, cell + 4 * k, Math.max(2, Math.round(2.5 * k)), 255, 214, 100, 255, 8);
                else border(L, x, y, cell, cell, 1, 214, 170, 70, 150, 6);
                L.btns.push({ x: x, y: y, w: cell, h: cell, fn: function () { setAvatar(name); picking = false; render(); } });
            })(HEADS[idx]);
        }
        // kontrol halaman + reset
        var cy = bot + btnH + 14 * k + ctrlH / 2, pw = 44 * k;
        function pageBtn(txt, cx, fn) {
            var b = spr('pf_btn_navy.png'); if (b) { fitTo(b, pw, 32 * k); b.setPosition(cc.p(cx, cy)); L.addChild(b, 6); }
            L.addChild(lbl(txt, 18 * k, CREAM, cx, cy, 0.5, 0.5), 7); L.btns.push({ x: cx - pw / 2, y: cy - 20 * k, w: pw, h: 40 * k, fn: fn });
        }
        var mid = rx + rw / 2;
        pageBtn('<', mid - 70 * k, function () { pickPage = (pickPage + pages - 1) % pages; render(); });
        L.addChild(lbl((pickPage + 1) + ' / ' + pages, 15 * k, CREAM, mid, cy, 0.5, 0.5), 7);
        pageBtn('>', mid + 70 * k, function () { pickPage = (pickPage + 1) % pages; render(); });
        var rw2 = 110 * k, rcx = rx + rw - rw2 / 2, rb = spr('pf_btn_gold.png');
        if (rb) { fitTo(rb, rw2, 32 * k); rb.setPosition(cc.p(rcx, cy)); L.addChild(rb, 6); }
        L.addChild(lbl('Use Letter', 13 * k, DARKBR, rcx, cy, 0.5, 0.5, rw2 - 10 * k), 7);
        L.btns.push({ x: rcx - rw2 / 2, y: cy - 20 * k, w: rw2, h: 40 * k, fn: function () { setAvatar(''); picking = false; render(); } });
        button(L, 'Back', rx + rw / 2, bot + btnH / 2, Math.min(200 * k, rw / 2), btnH, false, function () { picking = false; render(); }, 20 * k);
    }

    // ── render ──
    function render() {
        var root = panel; if (!root) return;
        clear(root); root.__sig = signature();
        var sz = WS(), W = Math.round(sz.width * 0.80), H = Math.round(sz.height * 0.90), k = H / 480, m = 12 * k, i, s;
        var ox = Math.round((sz.width - W) / 2), oy = Math.round((sz.height - H) / 2);
        var L = cc.Node.create(); L.setPosition(cc.p(ox, oy)); L.btns = []; root.addChild(L, 1);
        var d = info(), hud = hudRef;

        // latar + bingkai
        s = spr('pf_bg.png');
        L.addChild(box(8, 20, 60, 255, W, H, 0, 0), 0);
        if (s) { fitTo(s, W, H); s.setPosition(cc.p(W / 2, H / 2)); L.addChild(s, 0); }
        border(L, m, m, W - 2 * m, H - 2 * m, Math.max(2, Math.round(3 * k)), 255, 214, 100, 255, 2);
        border(L, m + 5 * k, m + 5 * k, W - 2 * m - 10 * k, H - 2 * m - 10 * k, Math.max(1, Math.round(1.5 * k)), 255, 214, 100, 110, 2);
        var cs = 52 * k, corners = [[m, H - m, false, false], [W - m, H - m, true, false], [m, m, false, true], [W - m, m, true, true]];
        for (i = 0; i < 4; i++) {
            s = spr('pf_corner.png');
            if (!s) continue;
            s.setScale(cs / 120); s.setFlipX(corners[i][2]); s.setFlipY(corners[i][3]);
            s.setAnchorPoint(cc.p(corners[i][2] ? 1 : 0, corners[i][3] ? 0 : 1));
            s.setPosition(cc.p(corners[i][0], corners[i][1])); L.addChild(s, 3);
        }

        // header
        var hy = H - m - 34 * k;
        L.addChild(lbl('Player Profile', 26 * k, CREAM, m + 34 * k, hy, 0, 0.5, W * 0.5), 5);
        L.addChild(box(255, 214, 100, 120, W - 2 * m - 60 * k, Math.max(1, Math.round(1.5 * k)), m + 30 * k, H - m - 62 * k), 4);
        s = spr('pf_close.png');
        if (s) { fitTo(s, 42 * k, 42 * k); s.setPosition(cc.p(W - m - 34 * k, hy)); L.addChild(s, 10); }
        L.btns.push({ x: W - m - 58 * k, y: hy - 24 * k, w: 48 * k, h: 48 * k, fn: closePanel });

        var top = H - m - 74 * k, bot = m + 18 * k, pad = 18 * k;

        // ── kartu kiri: profil ──
        var lw = Math.min(W * 0.30, 250 * k), lx = m + pad, ly = bot, lh = top - bot, lcx = lx + lw / 2;
        card(L, lx, ly, lw, lh, k, 4);
        var ay = top - 80 * k;
        var av = 128 * k, avInner = av * (212 / 240), avName = getAvatar(), hs = avName ? headSpr(avName) : null;
        L.addChild(box(12, 30, 84, 255, avInner, avInner, lcx - avInner / 2, ay - avInner / 2), 5);
        if (hs) { var hc = hs.getContentSize(); hs.setScale(avInner / Math.max(1, hc.width)); hs.setPosition(cc.p(lcx, ay)); L.addChild(hs, 6); }
        else L.addChild(lbl(d.name.charAt(0).toUpperCase(), 60 * k, GOLD, lcx, ay, 0.5, 0.5), 6);
        s = spr('pf_avatar_sq.png');
        if (s) { s.setScale(av / 240); s.setPosition(cc.p(lcx, ay)); L.addChild(s, 7); }
        s = spr('pf_edit.png');
        if (s) { s.setScale(34 * k / 64); s.setPosition(cc.p(lcx + av / 2 - 8 * k, ay - av / 2 + 8 * k)); L.addChild(s, 9); }
        L.btns.push({ x: lcx - av / 2, y: ay - av / 2, w: av, h: av, fn: function () { picking = true; pickPage = 0; render(); } });
        L.addChild(lbl(d.name, 22 * k, CREAM, lcx, ay - 92 * k, 0.5, 0.5, lw - 20 * k), 7);
        s = spr('hl_vip.png');
        if (s) { s.setScale(0.62 * k); s.setPosition(cc.p(lcx, ay - 128 * k)); L.addChild(s, 7); }
        L.addChild(lbl('VIP ' + d.vip, 13 * k, DARKBR, lcx, ay - 128 * k, 0.5, 0.5), 8);
        L.addChild(lbl('ID: ' + d.id, 13 * k, GREY, lcx, ly + 22 * k, 0.5, 0.5, lw - 20 * k), 7);

        // ── kanan ──
        var rx = lx + lw + pad, rw = W - m - pad - rx, tabH = 38 * k, tabW = Math.min(132 * k, (rw - 30 * k) / 4);
        if (picking) { renderPicker(L, rx, rw, top, bot, k, lcx); root.btns.push({ x: 0, y: 0, w: sz.width, h: sz.height, fn: closePanel }); root.btns.push({ x: ox, y: oy, w: W, h: H, fn: function () { } }); for (i = 0; i < L.btns.length; i++) { var pb = L.btns[i]; root.btns.push({ x: pb.x + ox, y: pb.y + oy, w: pb.w, h: pb.h, fn: pb.fn }); } return; }
        var tabs = [['info', 'Info'], ['settings', 'Settings'], ['notices', 'Notices'], ['pulls', 'Pulls']];
        for (i = 0; i < tabs.length; i++) {
            (function (key, text, idx) {
                var cx = rx + tabW / 2 + idx * (tabW + 10 * k), cy = top - tabH / 2, on = (tab === key);
                s = spr(on ? 'pf_btn_gold.png' : 'pf_btn_tab_off.png');
                if (s) { fitTo(s, tabW, tabH); s.setPosition(cc.p(cx, cy)); L.addChild(s, 6); }
                L.addChild(lbl(text, 17 * k, on ? DARKBR : GREY, cx, cy, 0.5, 0.5, tabW - 10 * k), 7);
                L.btns.push({ x: cx - tabW / 2, y: cy - tabH / 2, w: tabW, h: tabH, fn: function () { if (tab !== key) { tab = key; render(); } } });
            })(tabs[i][0], tabs[i][1], i);
        }
        var bodyTop = top - tabH - 14 * k, btnH = 46 * k, btnY = bot + btnH / 2, bodyBot = bot + btnH + 14 * k;
        var bw = Math.min(200 * k, rw / 2);

        if (tab === 'info') {
            // kartu level + bar EXP
            var lh2 = 84 * k, ly2 = bodyTop - lh2;
            card(L, rx, ly2, rw, lh2, k, 4);
            L.addChild(lbl('Level ' + d.lv, 22 * k, GOLD, rx + 16 * k, ly2 + lh2 - 24 * k, 0, 0.5, rw * 0.4), 7);
            var expTxt = d.need > 0 ? ('EXP  ' + dots(d.exp) + ' / ' + dots(d.need)) : ('EXP  ' + dots(d.exp) + '  (MAX)');
            L.addChild(lbl(expTxt, 17 * k, WHITE, rx + rw - 16 * k, ly2 + lh2 - 24 * k, 1, 0.5, rw * 0.55), 7);
            var barW = rw - 32 * k, barH = 22 * k, bx = rx + 16 * k, by = ly2 + 14 * k, pct = d.need > 0 ? Math.max(0, Math.min(1, d.exp / d.need)) : 1;
            s = spr('pf_bar_bg.png');
            if (s) { s.setAnchorPoint(cc.p(0, 0)); fitTo(s, barW, barH); s.setPosition(cc.p(bx, by)); L.addChild(s, 6); }
            s = spr('pf_bar_fill.png');
            if (s && pct > 0) {
                s.setAnchorPoint(cc.p(0, 0));
                var fw = (barW - 8 * barW / 600) * pct;
                s.setScaleX(Math.max(fw, 6 * k) / 592); s.setScaleY((barH - 8 * barH / 28) / 20);
                s.setPosition(cc.p(bx + 4 * barW / 600, by + 4 * barH / 28)); L.addChild(s, 7);
            }
            L.addChild(lbl((Math.floor(pct * 1000) / 10) + '%', 12 * k, WHITE, bx + barW / 2, by + barH / 2, 0.5, 0.5), 8);

            // grid statistik 2 x 2
            var stats = [
                ['Gold', hudText(hud && hud.goldMC), 'ic_coin.png'],
                ['Silver', hudText(hud && hud.silverMC), 'ic_gem.png'],
                ['Stamina', hudText(hud && hud.energyMC), 'ic_flame.png'],
                ['Combat Power', dots(hudText(hud && hud.forceMC)), 'ic_cp.png']
            ];
            var gTop = ly2 - 12 * k, gap = 12 * k, rows = 2, gh = (gTop - bodyBot - gap * (rows - 1)) / rows, gw = (rw - gap) / 2;
            gh = Math.min(gh, 74 * k);
            for (i = 0; i < stats.length; i++) {
                var col = i % 2, row = Math.floor(i / 2), gx = rx + col * (gw + gap), gy = gTop - (row + 1) * gh - row * gap;
                card(L, gx, gy, gw, gh, k, 4);
                L.addChild(lbl(stats[i][0], 12 * k, GREY, gx + 14 * k, gy + gh - 15 * k, 0, 0.5, gw - 70 * k), 7);
                L.addChild(lbl(stats[i][1], 21 * k, CREAM, gx + 14 * k, gy + gh * 0.34, 0, 0.5, gw - 70 * k), 7);
                if (stats[i][2]) {
                    s = spr(stats[i][2]);
                    if (s) { s.setScale(Math.min(0.9 * k, gh * 0.7 / 44)); s.setPosition(cc.p(gx + gw - 28 * k, gy + gh / 2)); L.addChild(s, 7); }
                }
            }
        } else {
            // tab Settings / Notices / Pulls: daftar baris dengan toggle atau tombol
            var rowsDef = tab === 'notices' ? noticeRows() : (tab === 'pulls' ? pullRows() : settingRows());
            var listTop = bodyTop;
            if (tab === 'pulls') {
                L.addChild(lbl("Hide notices of other players' pulls (popup and System Channel).", 12 * k, GREY, rx + 4 * k, bodyTop - 8 * k, 0, 0.5, rw - 8 * k), 7);
                listTop = bodyTop - 22 * k;
            }
            var cols = rowsDef.length <= 3 ? 1 : 2, rgap = 10 * k, nrows = Math.ceil(rowsDef.length / cols);
            var cw = (rw - rgap * (cols - 1)) / cols, rh = Math.min(62 * k, (listTop - bodyBot - rgap * (nrows - 1)) / nrows);
            for (i = 0; i < rowsDef.length; i++) {
                (function (r, idx) {
                    var col = idx % cols, row = Math.floor(idx / cols);
                    var x = rx + col * (cw + rgap), y = listTop - (row + 1) * rh - row * rgap;
                    card(L, x, y, cw, rh, k, 4);
                    var ctlW = r.toggle ? 74 * k : 92 * k;
                    L.addChild(wrapLbl(r.t, 15 * k, CREAM, x + 12 * k, y + rh / 2, cw - ctlW - 26 * k), 7);
                    if (r.toggle) {
                        var tg = spr(r.on ? 'pf_tog_on.png' : 'pf_tog_off.png');
                        if (tg) { tg.setScale(0.6 * k); tg.setPosition(cc.p(x + cw - 12 * k - 38 * k * 0.98, y + rh / 2)); L.addChild(tg, 8); }
                        L.btns.push({ x: x + cw - ctlW - 6 * k, y: y, w: ctlW + 6 * k, h: rh, fn: r.fn });
                    } else {
                        var bwid = 80 * k, bht = Math.min(36 * k, rh - 12 * k), bcx = x + cw - 12 * k - bwid / 2;
                        var b2 = spr('pf_btn_gold.png');
                        if (b2) { fitTo(b2, bwid, bht); b2.setPosition(cc.p(bcx, y + rh / 2)); L.addChild(b2, 8); }
                        L.addChild(lbl(r.btn, 14 * k, DARKBR, bcx, y + rh / 2, 0.5, 0.5, bwid - 10 * k), 9);
                        L.btns.push({ x: x + cw - ctlW - 6 * k, y: y, w: ctlW + 6 * k, h: rh, fn: r.fn });
                    }
                })(rowsDef[i], i);
            }
        }
        button(L, 'Close', rx + rw / 2, btnY, bw, btnH, false, closePanel, 20 * k);
        root.btns.push({ x: 0, y: 0, w: sz.width, h: sz.height, fn: closePanel });          // ketuk di luar dialog = tutup
        root.btns.push({ x: ox, y: oy, w: W, h: H, fn: function () { } });                   // ketuk area kosong dalam dialog = diam
        for (i = 0; i < L.btns.length; i++) { var bb = L.btns[i]; root.btns.push({ x: bb.x + ox, y: bb.y + oy, w: bb.w, h: bb.h, fn: bb.fn }); }
    }

    function openPanel(hud) {
        var sc = scene(); if (!sc) return false;
        hudRef = hud; tab = 'info'; picking = false; pickPage = 0;
        closePanel();
        panel = newLayer();
        sc.addChild(panel, Z_PANEL);
        render();
        var mine = panel;
        panel.schedule(function () { try { if (panel === mine && mine.__sig !== signature()) render(); } catch (e) { } }, 0.3);
        return true;
    }

    // ── kait: klik badge level ──
    var origEnded = UserInfor.prototype.onTouchesEnded;
    UserInfor.prototype.onTouchesEnded = function () {
        var r = origEnded.apply(this, arguments);
        try {
            if (this.inforLayer && this.inforLayer.isVisible()) {
                var ok = false;
                try { ok = openPanel(this); } catch (e) { ok = false; }
                if (ok) {                       // popup kecil lama dibatalkan; bila panel gagal dibuka, popup lama tetap tampil
                    this.inforLayer.setVisible(false);
                    if (this.vipNode) this.vipNode.setVisible(true);
                }
            }
        } catch (e2) { }
        return r;
    };
    UserInfor.prototype.__nhProfilePanel = true;
    try { pullFilter(); } catch (e) { }                  // muat pilihan filter tersimpan sejak game dibuka
}());

// ═════════════════════════════════════════════════════════════════
// NH DIALOG SKINS — tampilan baru untuk dialog "Reminder" (TipScene) dan "Redeem Code" (InputCardCodeLayer)
//
//   • Logika, callback, dan area sentuh dialog asli TIDAK diubah. Setelah dialog asli selesai disusun
//     (initUI), semua gambar bawaannya dibuat transparan (opacity 0, node tetap ada & tetap bisa disentuh)
//     lalu digambar ulang bergaya navy + emas persis di posisi bawaan: bingkai, judul, tombol OK/Cancel/X,
//     tombol Redeem, bingkai kolom input.
//   • Bila ukuran/posisi node tidak bisa dibaca, dialog asli dibiarkan apa adanya (tidak ada yang rusak).
//   • Gambar: image/hl/pf_*.png (sama dengan panel profil).  Matikan dengan NH_DIALOG_SKINS = false.
// Sintaks ES5 saja.
// ═════════════════════════════════════════════════════════════════
(function installDialogSkins() {
    var NH_DIALOG_SKINS = true;
    if (!NH_DIALOG_SKINS || typeof cc === 'undefined') return;

    var IMG = 'image/hl/';
    var GOLD = cc.c3b(255, 214, 100), CREAM = cc.c3b(255, 244, 214), GREY = cc.c3b(160, 176, 214), DARKBR = cc.c3b(70, 40, 10);

    function font() { return (typeof pFont1 !== 'undefined' && pFont1) ? pFont1 : ((typeof pFont0 !== 'undefined' && pFont0) ? pFont0 : 'Arial'); }
    function spr(file) { try { return cc.Sprite.create(IMG + file); } catch (e) { return null; } }
    function box(r, g, b, a, w, h, x, y) { var n = cc.LayerColor.create(cc.c4b(r, g, b, a), w, h); n.setPosition(cc.p(x, y)); return n; }
    function fitTo(s, w, h) { var c = s.getContentSize(); if (c.width > 0 && c.height > 0) { s.setScaleX(w / c.width); s.setScaleY(h / c.height); } }
    function lbl(text, size, color, x, y, ax, maxW) {
        var t = cc.LabelTTF.create(String(text), font(), size);
        t.setAnchorPoint(cc.p(ax, 0.5)); t.setColor(color); t.setPosition(cc.p(x, y));
        if (maxW) { var w = t.getContentSize().width; if (w > maxW && w > 0) t.setScale(maxW / w); }
        return t;
    }
    function rectOf(n) {
        var r;
        try { var b = n.getBoundingBox(); r = { x: b.x, y: b.y, w: b.width, h: b.height }; }
        catch (e) {
            try {
                var p = n.getPosition(), s = n.getContentSize(), a = n.getAnchorPoint(), w = s.width * n.getScaleX(), h = s.height * n.getScaleY();
                r = { x: p.x - w * a.x, y: p.y - h * a.y, w: w, h: h };
            } catch (e2) { return null; }
        }
        return (r && isFinite(r.x) && isFinite(r.y) && r.w > 1 && r.h > 1) ? r : null;
    }
    function visible(n) { try { return !!n && n.isVisible(); } catch (e) { return !!n; } }
    function hideAll(node, keep) {
        var kids = null, i;
        try { kids = node.getChildren(); } catch (e) { }
        if (!kids) return;
        for (i = 0; i < kids.length; i++) {
            var c = kids[i], skip = false, j;
            for (j = 0; j < keep.length; j++) if (c === keep[j]) skip = true;
            if (skip) continue;
            try { if (typeof c.setOpacity === 'function') c.setOpacity(0); } catch (e2) { }
            hideAll(c, keep);
        }
    }
    function union(list) {
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i;
        for (i = 0; i < list.length; i++) if (list[i]) {
            x0 = Math.min(x0, list[i].x); y0 = Math.min(y0, list[i].y);
            x1 = Math.max(x1, list[i].x + list[i].w); y1 = Math.max(y1, list[i].y + list[i].h);
        }
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    function border(c, x, y, w, h, t, r, g, b, a) {
        c.addChild(box(r, g, b, a, w, t, x, y)); c.addChild(box(r, g, b, a, w, t, x, y + h - t));
        c.addChild(box(r, g, b, a, t, h, x, y)); c.addChild(box(r, g, b, a, t, h, x + w - t, y));
    }
    function frame(c, R, s, title, hdr) {
        c.addChild(box(8, 20, 60, 250, R.w, R.h, R.x, R.y));
        border(c, R.x, R.y, R.w, R.h, Math.max(2, 3 * s), 255, 214, 100, 255);
        border(c, R.x + 5 * s, R.y + 5 * s, R.w - 10 * s, R.h - 10 * s, Math.max(1, 1.5 * s), 255, 214, 100, 110);
        var cs = 34 * s, cx = [R.x, R.x + R.w, R.x, R.x + R.w], cy = [R.y + R.h, R.y + R.h, R.y, R.y], i, k;
        for (i = 0; i < 4; i++) {
            k = spr('pf_corner.png'); if (!k) continue;
            k.setScale(cs / 120); k.setFlipX(i % 2 === 1); k.setFlipY(i > 1);
            k.setAnchorPoint(cc.p(i % 2 === 1 ? 1 : 0, i > 1 ? 0 : 1)); k.setPosition(cc.p(cx[i], cy[i])); c.addChild(k);
        }
        c.addChild(lbl(title, 22 * s, CREAM, R.x + 22 * s, R.y + R.h - hdr / 2, 0, R.w - 90 * s));
        c.addChild(box(255, 214, 100, 120, R.w - 36 * s, Math.max(1, 1.5 * s), R.x + 18 * s, R.y + R.h - hdr));
    }
    function skinButton(c, r, text, gold, s) {
        var b = spr(gold ? 'pf_btn_gold.png' : 'pf_btn_navy.png');
        if (b) { fitTo(b, r.w, r.h); b.setPosition(cc.p(r.x + r.w / 2, r.y + r.h / 2)); c.addChild(b); }
        c.addChild(lbl(text, Math.min(r.h * 0.46, 24 * s), gold ? DARKBR : CREAM, r.x + r.w / 2, r.y + r.h / 2, 0.5, r.w - 12 * s));
    }
    function moveCloseTo(btn, cx, cy) {
        var r = rectOf(btn); if (!r) return null;
        var p = btn.getPosition();
        btn.setPosition(cc.p(p.x + (cx - (r.x + r.w / 2)), p.y + (cy - (r.y + r.h / 2))));
        return rectOf(btn);
    }
    function drawClose(c, btn, s) {
        var r = rectOf(btn); if (!r) return;
        var k = spr('pf_close.png'), d = Math.min(r.w, r.h);
        if (k) { fitTo(k, d, d); k.setPosition(cc.p(r.x + r.w / 2, r.y + r.h / 2)); c.addChild(k); }
    }

    // ───────────── Reminder (TipScene) ─────────────
    function skinTip(self) {
        var sc = self.scene, ctl = sc && sc.controller;
        if (!ctl || !ctl.bg || !ctl.okBtn || !self.txtTF || sc.__nhSkinned) return;
        var bg = rectOf(ctl.bg), ok = rectOf(ctl.okBtn);
        if (!bg || !ok) return;
        var s = Math.max(0.5, ok.h / 50), hdr = 44 * s, showOk = visible(ctl.okBtn), showCancel = !!ctl.cancelBtn && visible(ctl.cancelBtn), showClose = !!ctl.closeBtn && visible(ctl.closeBtn);
        var cancel = showCancel ? rectOf(ctl.cancelBtn) : null;
        var U = union([bg, showOk ? ok : null, cancel]);
        var R = { x: U.x - 10 * s, y: U.y - 14 * s, w: U.w + 20 * s, h: U.h + 14 * s + 10 * s + hdr };
        var parent = ctl.bg.getParent && ctl.bg.getParent(); if (!parent) return;
        var keep = [self.txtTF];
        hideAll(sc, keep);
        try { ctl.bg.setOpacity(0); } catch (e) { }
        var cr = null;
        if (showClose) cr = moveCloseTo(ctl.closeBtn, R.x + R.w - 28 * s, R.y + R.h - hdr / 2);
        var art = cc.Node.create(); parent.addChild(art, -10);
        frame(art, R, s, 'Reminder', hdr);
        if (showCancel && cancel) skinButton(art, cancel, 'Cancel', false, s);
        if (showOk) skinButton(art, ok, 'OK', true, s);
        if (showClose) drawClose(art, ctl.closeBtn, s);
        try { self.txtTF.setColor(CREAM); } catch (e2) { }
        sc.__nhSkinned = true;
    }

    // ───────────── Redeem Code (InputCardCodeLayer) ─────────────
    function skinRedeem(self) {
        var sc = self.scene, ctl = sc && sc.controller, input = self.inputbox;
        if (!ctl || !ctl.duihuan || !input || sc.__nhSkinned) return;
        var ir = rectOf(input), br = rectOf(ctl.duihuan);
        if (!ir || !br) return;
        var s = Math.max(0.5, Math.min(1.6, ir.h / 50)), hdr = 44 * s, sub = 30 * s;
        var hint = Math.max(0, ir.y - (br.y + br.h)) >= 24 * s;
        var U = union([ir, br]);
        var R = { x: U.x - 40 * s, y: U.y - 22 * s, w: U.w + 80 * s, h: U.h + 22 * s + 14 * s + hdr + sub };
        var parent = input.getParent(); if (!parent) return;
        hideAll(sc, [input]);
        var art = cc.Node.create(); parent.addChild(art, -10);
        frame(art, R, s, 'Redeem Code', hdr);
        art.addChild(lbl('Enter your code. Rewards are added directly to your account.', 13 * s, GREY, R.x + R.w / 2, ir.y + ir.h + 4 * s + sub / 2 + 2 * s, 0.5, R.w - 36 * s));
        border(art, ir.x - 4 * s, ir.y - 4 * s, ir.w + 8 * s, ir.h + 8 * s, Math.max(2, 2.5 * s), 255, 214, 100, 255);
        if (hint) art.addChild(lbl('Letters and numbers. Case-insensitive.', 12 * s, GREY, R.x + R.w / 2, (ir.y + br.y + br.h) / 2 - 2 * s, 0.5, R.w - 36 * s));
        skinButton(art, br, 'Redeem', true, s);
        if (ctl.closeBtn) { moveCloseTo(ctl.closeBtn, R.x + R.w - 28 * s, R.y + R.h - hdr / 2); drawClose(art, ctl.closeBtn, s); }
        sc.__nhSkinned = true;
    }

    function hook(cls, fn) {
        try {
            if (typeof cls === 'undefined' || !cls || !cls.prototype || cls.prototype.__nhSkin || typeof cls.prototype.initUI !== 'function') return;
            var orig = cls.prototype.initUI;
            cls.prototype.initUI = function () {
                var r = orig.apply(this, arguments);
                try { fn(this); } catch (e) { }     // gagal = tampilan asli tetap dipakai
                return r;
            };
            cls.prototype.__nhSkin = true;
        } catch (e) { }
    }
    hook(typeof TipScene !== 'undefined' ? TipScene : undefined, skinTip);
    hook(typeof InputCardCodeLayer !== 'undefined' ? InputCardCodeLayer : undefined, skinRedeem);
}());
