import zipfile, subprocess, os, shutil, json

# 1. Load compact master ninjas mapping
with open('master_ninjas_compact.json', 'r', encoding='utf-8') as f:
    compact_ninjas = json.load(f)

# Build JS literal for compact ninjas
js_mn_literal = json.dumps(compact_ninjas)

# 2. Read existing main.js from APK
with zipfile.ZipFile('OkkaNHNE-Private.apk', 'r') as zin:
    ui_main = zin.read('assets/UI/main.js').decode('utf-8', errors='ignore')

# Remove any previous role guard if present
if '// 2e. Safeguard Config.roleObject' in ui_main:
    start_idx = ui_main.find('    // 2e. Safeguard Config.roleObject')
    end_idx = ui_main.find('    // 2b. Neutralize TalkingData')
    ui_main = ui_main[:start_idx] + ui_main[end_idx:]

hook_marker = '// 2b. Neutralize TalkingData analytics & AppsFlyer native JNI bridges immediately'
assert hook_marker in ui_main, 'Hook marker not found in assets/UI/main.js!'

role_guard_code = '''    // 2e. Safeguard Config.roleObject, GameUserInfor, GameData, ArmatureTools against missing/custom ninjas
    try {
        // 2e-quality: Extend qualityIconlist and qualityCol for authentic D..UR tiers
        try {
            if (typeof qualityIconlist !== "undefined" && Array.isArray(qualityIconlist)) {
                qualityIconlist[0] = "";
                qualityIconlist[1] = "D";
                qualityIconlist[2] = "C";
                qualityIconlist[3] = "B";
                qualityIconlist[4] = "A";
                qualityIconlist[5] = "S";
                qualityIconlist[6] = "SS";
                qualityIconlist[7] = "SSS";
                qualityIconlist[8] = "UR";
                while (qualityIconlist.length <= 15) {
                    qualityIconlist.push("UR");
                }
            }
            if (typeof qualityCol !== "undefined" && Array.isArray(qualityCol)) {
                var _c = (typeof cc !== "undefined" && cc.c3b) ? cc.c3b : function(r, g, b) { return { r: r, g: g, b: b }; };
                qualityCol[0] = _c(255, 255, 255);
                qualityCol[1] = _c(180, 180, 180); // D - Gray (#b4b4b4)
                qualityCol[2] = _c(80, 200, 100);   // C - Green (#50c864)
                qualityCol[3] = _c(50, 150, 255);  // B - Blue (#3296ff)
                qualityCol[4] = _c(190, 60, 230);  // A - Purple (#be3ce6)
                qualityCol[5] = _c(245, 50, 50);   // S - Red (#f53232)
                qualityCol[6] = _c(255, 200, 20);  // SS - Gold/Yellow (#ffc814)
                qualityCol[7] = _c(220, 50, 255);  // SSS - Bright Purple/Magenta (#dc32ff)
                qualityCol[8] = _c(0, 210, 255);   // UR - Electric Blue / Cyan (#00d2ff)
                while (qualityCol.length <= 15) {
                    qualityCol.push(qualityCol[8]);
                }
            }
        } catch(eQual) {}

        // 2e-blue-border: UR Ninja Blue Border & Blue Star Hook in SpriteFrameCache
        try {
            if (typeof cc !== "undefined" && cc.SpriteFrameCache && cc.SpriteFrameCache.prototype) {
                var _origGetSF = cc.SpriteFrameCache.prototype.getSpriteFrame;
                cc.SpriteFrameCache.prototype.getSpriteFrame = function(name) {
                    if (name === "image/iRGB32/quality_bar_8.png") {
                        return _origGetSF.call(this, "image/iRGB32/quality_bar_3.png"); // Blue border for UR!
                    }
                    if (name === "image/iicon/quality_xx_8.png") {
                        return _origGetSF.call(this, "image/iicon/quality_xx_3.png"); // Blue star for UR!
                    }
                    if (name === "image/iicon/quality_item_UR.png") {
                        return _origGetSF.call(this, "image/iicon/quality_item_B.png");
                    }
                    if (name === "image/iicon/quality_skill_UR.png") {
                        return _origGetSF.call(this, "image/iicon/quality_skill_B.png");
                    }
                    var f = _origGetSF.apply(this, arguments);
                    if (!f && name && typeof name === "string") {
                        if (name.indexOf("quality_bar_") !== -1) {
                            return _origGetSF.call(this, "image/iRGB32/quality_bar_3.png");
                        }
                        if (name.indexOf("quality_xx_") !== -1) {
                            return _origGetSF.call(this, "image/iicon/quality_xx_3.png");
                        }
                    }
                    return f;
                };
            }
        } catch(eBorder) {}

        // 2e-armature: Safe ArmatureLoad & ArmatureTools fallbacks without touching native RoleStopBox
        try {
            if (typeof ArmatureLoad !== "undefined" && ArmatureLoad.prototype && ArmatureLoad.prototype.addXML) {
                var _origAddXML = ArmatureLoad.prototype.addXML;
                ArmatureLoad.prototype.addXML = function(xmlfile) {
                    if (!xmlfile) {
                        xmlfile = "mingren";
                    }
                    return _origAddXML.call(this, xmlfile);
                };
            }

            if (typeof ArmatureTools !== "undefined" && ArmatureTools.roleArmature) {
                var _origRoleArmature = ArmatureTools.roleArmature;
                ArmatureTools.roleArmature = function(rid) {
                    var arm = null;
                    try {
                        arm = _origRoleArmature.apply(this, arguments);
                    } catch(eArm) {}

                    if (!arm) {
                        try {
                            arm = _origRoleArmature.call(this, 17, 0) || _origRoleArmature.call(this, 1, 0);
                        } catch(eArm2) {}
                    }
                    return arm;
                };
            }
        } catch(eArmSafe) {}

        var _MN = __JS_MN_LITERAL__;
        var _polyFillAllRoles = function(ro) {
            if (!ro || typeof ro !== "object") return;
            var base = ro[17] || ro[9] || ro[1];
            if (!base) {
                for (var k in ro) {
                    if (ro.hasOwnProperty(k) && ro[k] && ro[k].xmlfile) {
                        base = ro[k];
                        break;
                    }
                }
            }
            if (!base) return;

            if (ro.__nhRolesGuarded && ro[170] && ro[199] && ro[170].xmlfile === "liudaoban") return;
            ro.__nhRolesGuarded = true;

            for (var nid = 0; nid <= 1000; nid++) {
                var d = _MN[nid] || _MN[String(nid)];
                if (!ro[nid]) {
                    var clone = {};
                    for (var prop in base) {
                        if (base.hasOwnProperty(prop)) {
                            clone[prop] = base[prop];
                        }
                    }
                    clone.id = nid;
                    clone.name = d ? d[0] : ("Shinobi " + nid);
                    clone.alt = d ? d[0] : ("Shinobi " + nid);
                    clone.quality = d ? d[1] : ((base && typeof base.quality !== "undefined") ? base.quality : 1);
                    clone.xmlfile = d ? d[2] : (base.xmlfile || "mingren");
                    clone.chakra = d ? d[3] : [1];
                    clone.hp = d ? d[4] : 1000;
                    clone.attack = d ? d[5] : 100;
                    clone.def = d ? d[6] : 50;
                    clone.speed = d ? d[7] : 100;
                    clone.skill = (d && d[8]) ? [d[8]] : (base.skill || [1149]);
                    clone.special_jutsu = (d && d[8]) ? d[8] : (base.special_jutsu || 1149);
                    ro[nid] = clone;
                } else if (d) {
                    ro[nid].name = d[0];
                    ro[nid].alt = d[0];
                    ro[nid].quality = d[1];
                    ro[nid].xmlfile = d[2];
                    ro[nid].chakra = d[3];
                    ro[nid].hp = d[4];
                    ro[nid].attack = d[5];
                    ro[nid].def = d[6];
                    ro[nid].speed = d[7];
                    if (d[8]) {
                        ro[nid].special_jutsu = d[8];
                        if (!ro[nid].skill || !Array.isArray(ro[nid].skill) || ro[nid].skill.length === 0) {
                            ro[nid].skill = [d[8]];
                        }
                    }
                }
            }

            ro[undefined] = ro[17] || base;
            ro["undefined"] = ro[17] || base;
            ro[null] = ro[17] || base;
            ro["null"] = ro[17] || base;
            ro[0] = ro[17] || base;
            ro["0"] = ro[17] || base;
            ro[""] = ro[17] || base;
            ro[NaN] = ro[17] || base;
            ro["NaN"] = ro[17] || base;

            if (typeof cc !== "undefined" && cc.log) {
                cc.log("[NH Safeguard] Successfully polyfilled roleObject with authentic master ninjas (0..1000)");
            }
        };

        var _polyFillAllSkills = function(so) {
            if (!so || typeof so !== "object") return;
            var baseSkill = so[1149] || so[1007] || so[1001];
            if (!baseSkill) {
                for (var k in so) {
                    if (so.hasOwnProperty(k) && so[k] && typeof so[k].quality !== "undefined") {
                        baseSkill = so[k];
                        break;
                    }
                }
            }
            if (!baseSkill) return;
            if (so.__nhSkillsGuarded) return;
            so.__nhSkillsGuarded = true;

            var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
            var sqo = cfg ? cfg.skillQualityObj : null;

            for (var sid = 1000; sid <= 3000; sid++) {
                if (!so[sid]) {
                    var clone = {};
                    for (var prop in baseSkill) {
                        if (baseSkill.hasOwnProperty(prop)) {
                            clone[prop] = baseSkill[prop];
                        }
                    }
                    clone.id = sid;
                    clone.quality = 1;
                    clone.alt = "Jutsu " + sid;
                    clone.name = "Jutsu " + sid;
                    clone.type = 1;
                    clone.icon = "skill_001";
                    clone.chakra = "1";
                    clone.timelineAReady = [];
                    clone.timelineARun = [];
                    clone.timelineAHit = [];
                    so[sid] = clone;
                }
                var q = so[sid].quality || 1;
                if (sqo) {
                    if (!sqo[q]) sqo[q] = [];
                    if (sqo[q].indexOf(sid) === -1) sqo[q].push(sid);
                }
            }
            if (typeof cc !== "undefined" && cc.log) {
                cc.log("[NH Safeguard] Successfully polyfilled skillObject & skillQualityObj (1000..3000)");
            }
        };

        if (typeof Config !== "undefined") {
            if (Config.getInstance) {
                var _origConfigGetInstance = Config.getInstance;
                var _inConfigCall = false;
                Config.getInstance = function () {
                    if (_inConfigCall) {
                        return _origConfigGetInstance.apply(this, arguments);
                    }
                    _inConfigCall = true;
                    try {
                        var inst = _origConfigGetInstance.apply(this, arguments);
                        if (inst && inst.roleObject) {
                            _polyFillAllRoles(inst.roleObject);
                        }
                        if (inst && inst.skillObject) {
                            _polyFillAllSkills(inst.skillObject);
                        }
                        return inst;
                    } finally {
                        _inConfigCall = false;
                    }
                };
            }
            if (Config.prototype && Config.prototype.processRole) {
                var _origProcessRole = Config.prototype.processRole;
                Config.prototype.processRole = function () {
                    var res = _origProcessRole.apply(this, arguments);
                    try {
                        if (this.roleObject) {
                            _polyFillAllRoles(this.roleObject);
                        }
                    } catch(ePR) {}
                    return res;
                };
            }
            if (Config.prototype && Config.prototype.processSkill) {
                var _origProcessSkill = Config.prototype.processSkill;
                Config.prototype.processSkill = function () {
                    var res = _origProcessSkill.apply(this, arguments);
                    try {
                        if (this.skillObject) {
                            _polyFillAllSkills(this.skillObject);
                        }
                    } catch(ePS) {}
                    return res;
                };
            }
        }

        // 2e2. Safeguard AdventureData and AdventureChapter against null chapter references
        try {
            if (typeof AdventureData !== "undefined" && AdventureData.prototype) {
                var _origGetChapter = AdventureData.prototype.getChapter;
                AdventureData.prototype.getChapter = function () {
                    var res = _origGetChapter ? _origGetChapter.apply(this, arguments) : null;
                    var num = parseInt(res);
                    if (isNaN(num) || num < 1) num = 1;
                    if (num > 14) num = 14;
                    return num;
                };
                var _origGetEliteChapter = AdventureData.prototype.getEliteChapter;
                AdventureData.prototype.getEliteChapter = function () {
                    var res = _origGetEliteChapter ? _origGetEliteChapter.apply(this, arguments) : null;
                    var num = parseInt(res);
                    if (isNaN(num) || num < 1) num = 1;
                    if (num > 14) num = 14;
                    return num;
                };
            }
            if (typeof AdventureChapter !== "undefined" && AdventureChapter.prototype) {
                var _origAdvChBuildUI = AdventureChapter.prototype.buildUI;
                AdventureChapter.prototype.buildUI = function () {
                    try {
                        for (var i = 1; i <= 14; i++) {
                            if (!this["adven_" + i]) {
                                this["adven_" + i] = this.adven_1 || cc.Node.create();
                            }
                        }
                    } catch(eAC) {}
                    if (_origAdvChBuildUI) {
                        return _origAdvChBuildUI.apply(this, arguments);
                    }
                };
            }
            if (typeof GameData !== "undefined" && GameData.prototype) {
                if (GameData.prototype.getFighters) {
                    var _origGF = GameData.prototype.getFighters;
                    GameData.prototype.getFighters = function () {
                        var list = _origGF ? _origGF.apply(this, arguments) : null;
                        if (!list || !Array.isArray(list) || list.length === 0) {
                            return [
                                { id: 1, hp: 1000, currHp: 1000, skillList: [1149], lv: 1, exp: 0 },
                                { id: 17, hp: 500, currHp: 500, skillList: [1149], lv: 1, exp: 0 }
                            ];
                        }
                        return list;
                    };
                }
                if (GameData.prototype.getCombat) {
                    var _origGC = GameData.prototype.getCombat;
                    GameData.prototype.getCombat = function () {
                        var c = _origGC ? _origGC.apply(this, arguments) : null;
                        if (!c || !Array.isArray(c) || c.length === 0) {
                            return [
                                { idx: 0, when: 1, tid: 1, sid: 1149, bhp: -500, status: 1 }
                            ];
                        }
                        return c;
                    };
                }
            }
        } catch (eAdvGuard) {}

        // 2f. Bypass strict validation in LoginScene & RegisterBox & persist active account
        try {
            if (typeof LoginScene !== "undefined" && LoginScene.prototype) {
                LoginScene.prototype.validateMail = function (str) {
                    return !!(str && String(str).trim().length >= 3);
                };

                LoginScene.prototype.checkAccountAndPwd = function (preset) {
                    var acc = "", pwd = "";
                    if (preset && typeof preset === "object") {
                        acc = preset.accId || "";
                        pwd = preset.pwd || "";
                    } else {
                        if (this.mailTTF && typeof this.mailTTF.getText === "function") {
                            acc = this.mailTTF.getText();
                        }
                        if (this.pwdTTF1 && typeof this.pwdTTF1.getText === "function") {
                            pwd = this.pwdTTF1.getText();
                        }
                    }
                    acc = String(acc || "").trim();
                    pwd = String(pwd || "").trim();

                    if (!acc || acc.length < 3) {
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {
                            PromptView.setPageView("loginTip", { target: this, text: "Username minimal 3 karakter." });
                        }
                        return;
                    }
                    if (!pwd || pwd.length < 1) {
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {
                            PromptView.setPageView("loginTip", { target: this, text: "Silakan masukkan password." });
                        }
                        return;
                    }

                    if (acc) {
                        try {
                            if (typeof sys !== "undefined" && sys.localStorage) {
                                sys.localStorage.setItem("nh_active_account", acc.toLowerCase());
                            }
                            if (typeof accountUtil !== "undefined" && accountUtil.saveAccount) {
                                accountUtil.saveAccount(acc.toLowerCase());
                            }
                        } catch(eAccSave) {}
                    }

                    var channel = 1;
                    if (typeof serverUtil !== "undefined" && serverUtil.getChannel) {
                        channel = serverUtil.getChannel();
                    }

                    return {
                        accId: acc.toLowerCase(),
                        pwd: pwd,
                        channel: channel,
                        lv: 1
                    };
                };

                LoginScene.prototype.regCheck = function () {
                    var acc = "", pwd1 = "", pwd2 = "";
                    if (this.mailTTF && typeof this.mailTTF.getText === "function") acc = this.mailTTF.getText();
                    if (this.pwdTTF1 && typeof this.pwdTTF1.getText === "function") pwd1 = this.pwdTTF1.getText();
                    if (this.pwdTTF2 && typeof this.pwdTTF2.getText === "function") pwd2 = this.pwdTTF2.getText();

                    acc = String(acc || "").trim();
                    pwd1 = String(pwd1 || "").trim();
                    pwd2 = String(pwd2 || "").trim();

                    if (!acc || acc.length < 3) {
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {
                            PromptView.setPageView("loginTip", { target: this, text: "Username minimal 3 karakter." });
                        }
                        return;
                    }
                    if (!pwd1 || pwd1.length < 1) {
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {
                            PromptView.setPageView("loginTip", { target: this, text: "Silakan masukkan password." });
                        }
                        return;
                    }
                    if (pwd1 !== pwd2) {
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {
                            PromptView.setPageView("loginTip", { target: this, text: "Konfirmasi password tidak cocok." });
                        }
                        return;
                    }

                    if (acc) {
                        try {
                            if (typeof sys !== "undefined" && sys.localStorage) {
                                sys.localStorage.setItem("nh_active_account", acc.toLowerCase());
                            }
                            if (typeof accountUtil !== "undefined" && accountUtil.saveAccount) {
                                accountUtil.saveAccount(acc.toLowerCase());
                            }
                        } catch(eAccSave) {}
                    }

                    var channel = 1;
                    if (typeof serverUtil !== "undefined" && serverUtil.getChannel) {
                        channel = serverUtil.getChannel();
                    }

                    return {
                        accId: acc.toLowerCase(),
                        pwd: pwd1,
                        channel: channel,
                        lv: 1
                    };
                };
            }

            if (typeof RegisterBox !== "undefined" && RegisterBox.prototype) {
                RegisterBox.prototype.checkAccountAndPwd = function () {
                    var acc = "", pwd = "";
                    if (this.mailTTF && typeof this.mailTTF.getText === "function") acc = this.mailTTF.getText();
                    if (this.pwdTTF && typeof this.pwdTTF.getText === "function") pwd = this.pwdTTF.getText();
                    acc = String(acc || "").trim();
                    pwd = String(pwd || "").trim();
                    if (!acc || acc.length < 3) return;
                    if (!pwd || pwd.length < 1) return;

                    if (acc) {
                        try {
                            if (typeof sys !== "undefined" && sys.localStorage) {
                                sys.localStorage.setItem("nh_active_account", acc.toLowerCase());
                            }
                            if (typeof accountUtil !== "undefined" && accountUtil.saveAccount) {
                                accountUtil.saveAccount(acc.toLowerCase());
                            }
                        } catch(eAccSave) {}
                    }

                    var channel = 1;
                    if (typeof serverUtil !== "undefined" && serverUtil.getChannel) {
                        channel = serverUtil.getChannel();
                    }
                    return {
                        accId: acc.toLowerCase(),
                        pwd: pwd,
                        channel: channel,
                        lv: 1
                    };
                };
            }
        } catch (eLoginFix) {}

        // 2g. Hook nad.sessionFactory & accountUtil to pass active account in login packet
        try {
            if (typeof accountUtil !== "undefined" && accountUtil.saveAccount) {
                var _origSaveAccount = accountUtil.saveAccount;
                accountUtil.saveAccount = function(acc) {
                    var str = (acc && typeof acc === "object") ? (acc.accId || acc.account || "") : String(acc || "");
                    if (str && typeof sys !== "undefined" && sys.localStorage) {
                        sys.localStorage.setItem("nh_active_account", str.toLowerCase().trim());
                    }
                    return _origSaveAccount ? _origSaveAccount.apply(this, arguments) : undefined;
                };
            }

            if (typeof nad !== "undefined" && nad && nad.sessionFactory) {
                var _origNadSessionFactory = nad.sessionFactory;
                nad.sessionFactory = function () {
                    var args = Array.prototype.slice.call(arguments);
                    args[0] = "ws://nh.digislams.my.id:80/nadsocket";
                    if (typeof cc !== "undefined" && cc.log) {
                        cc.log("[NH nad.sessionFactory] connecting to " + args[0]);
                    }
                    var sess = _origNadSessionFactory.apply(this, args);
                    if (sess && typeof sess.send === "function" && !sess.__nhWrapped) {
                        sess.__nhWrapped = true;
                        var _origSessSend = sess.send;
                        sess.send = function (data) {
                            try {
                                if (typeof data === "string" && (data.indexOf('"type":8') !== -1 || data.indexOf('"type": 8') !== -1)) {
                                    var p = JSON.parse(data);
                                    if (p && p.type === 8 && Array.isArray(p.source)) {
                                        var activeAcc = null;
                                        if (typeof sys !== "undefined" && sys.localStorage) {
                                            activeAcc = sys.localStorage.getItem("nh_active_account");
                                        }
                                        if (!activeAcc && typeof accountUtil !== "undefined" && accountUtil.getAccount) {
                                            var aObj = accountUtil.getAccount();
                                            if (typeof aObj === "string") {
                                                activeAcc = aObj;
                                            } else if (aObj && typeof aObj === "object") {
                                                activeAcc = aObj.accId || aObj.account || aObj.username || "";
                                            }
                                        }
                                        if (activeAcc && typeof activeAcc === "string" && activeAcc.trim() && activeAcc !== "[object Object]") {
                                            p.source[0] = activeAcc.trim().toLowerCase();
                                            data = JSON.stringify(p);
                                            if (typeof cc !== "undefined" && cc.log) {
                                                cc.log("[NH Session] Injected active account into login packet: " + p.source[0]);
                                            }
                                        }
                                    }
                                }
                            } catch(eSendHook) {}
                            return _origSessSend.call(this, data);
                        };
                    }
                    return sess;
                };
            }
        } catch (eNadHook) {}

        // 2h. Permanent VIP and Level Display Guard: keep VIP badge and level aligned and visible
        try {
            if (typeof UserInfor !== "undefined" && UserInfor.prototype) {
                var _adjustLvPos = function (self) {
                    try {
                        if (self && self.lvNum) {
                            if (typeof self.lvNum.__nhBaseY === "undefined") {
                                self.lvNum.__nhBaseY = self.lvNum.getPositionY();
                            }
                            self.lvNum.setPositionY(self.lvNum.__nhBaseY - 10);
                        }
                    } catch (eLvPos) {}
                };

                var _origInitUI = UserInfor.prototype.initUI;
                UserInfor.prototype.initUI = function () {
                    var r = _origInitUI ? _origInitUI.apply(this, arguments) : undefined;
                    _adjustLvPos(this);
                    try {
                        if (this.updatVip) this.updatVip();
                    } catch(eInitVip) {}
                    return r;
                };

                var _origUserDataChange = UserInfor.prototype.userDataChange;
                if (typeof _origUserDataChange === "function") {
                    UserInfor.prototype.userDataChange = function () {
                        var r = _origUserDataChange ? _origUserDataChange.apply(this, arguments) : undefined;
                        _adjustLvPos(this);
                        return r;
                    };
                }

                var _origUpdata = UserInfor.prototype.updata;
                if (typeof _origUpdata === "function") {
                    UserInfor.prototype.updata = function () {
                        var r = _origUpdata ? _origUpdata.apply(this, arguments) : undefined;
                        _adjustLvPos(this);
                        return r;
                    };
                }

                var _origUpdatVip = UserInfor.prototype.updatVip;
                UserInfor.prototype.updatVip = function () {
                    var res = _origUpdatVip ? _origUpdatVip.apply(this, arguments) : undefined;
                    try {
                        var ud = typeof UserData !== "undefined" && UserData.getInstance ? UserData.getInstance() : null;
                        var vlv = (ud && typeof ud.vipLv !== "undefined") ? parseInt(ud.vipLv) : 0;
                        if (isNaN(vlv) || vlv < 0) vlv = 0;
                        
                        if (this.vipNode) {
                            this.vipNode.setVisible(true);
                        }
                        if (this.viplvImg) {
                            this.viplvImg.setVisible(true);
                            if (typeof this.viplvImg.updata === "function") {
                                this.viplvImg.updata(vlv);
                            }
                        }
                        if (this.lvNum && typeof this.lvNum.updata === "function" && ud && typeof ud.lv !== "undefined") {
                            this.lvNum.updata(ud.lv);
                        }
                        _adjustLvPos(this);
                    } catch(eVip) {}
                    return res;
                };
            }
        } catch(eVipGuard) {}

        // 2i. InforNinJaScene: Replace "Sample Text" with authentic Ninja Name, grade font color (D..UR), fill default ninjutsu, and enable closeBtn
        try {
            if (typeof InforNinJaScene !== "undefined" && InforNinJaScene.prototype) {
                var _origInforNinJaUpdata = InforNinJaScene.prototype.updata;
                InforNinJaScene.prototype.updata = function() {
                    // Prevent TypeError: Cannot read property 'setStringQLv' of undefined
                    try {
                        if (this.scene && this.scene.controller) {
                            if (!this.scene.controller.alt) {
                                this.scene.controller.alt = (this.controller && this.controller.alt) ? this.controller.alt : (this.alt || null);
                            }
                            if (this.scene.controller.alt && !this.scene.controller.alt.setStringQLv) {
                                this.scene.controller.alt.setStringQLv = function(name) {
                                    try { if (this.setString) this.setString(name); } catch(e) {}
                                };
                            }
                        }
                    } catch(ePre) {}

                    var ret = undefined;
                    try {
                        if (_origInforNinJaUpdata) {
                            ret = _origInforNinJaUpdata.apply(this, arguments);
                        }
                    } catch(eOrig) {
                        if (typeof cc !== "undefined" && cc.log) cc.log("[NH Handled] _origInforNinJaUpdata: " + eOrig);
                    }

                    try {
                        var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                        var key = this.curRoleKey || (rd ? rd.getCurrentKey() : null);
                        var hero = (rd && rd.heros && key) ? rd.heros[key] : null;
                        var rid = hero ? (hero.id || hero.rid) : (rd ? rd.getRoleID(key) : null);
                        var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                        var ro = (cfg && cfg.roleObject && rid) ? cfg.roleObject[rid] : null;
                        var quality = ro ? ro.quality : (hero ? hero.quality : 1);
                        if (quality > 8) quality = 8;
                        if (quality < 1) quality = 1;

                        var col = (typeof qualityCol !== "undefined" && qualityCol[quality]) ? qualityCol[quality] : cc.c3b(255, 255, 255);
                        var qGrade = (typeof qualityIconlist !== "undefined" && qualityIconlist[quality]) ? qualityIconlist[quality] : "D";
                        var ninjaName = (ro && (ro.name || ro.alt)) ? (ro.name || ro.alt) : (hero ? hero.name : "Shinobi");
                        var lv = hero ? hero.lv : (ro ? (ro.lv || 1) : 1);

                        var ctl = this.controller || this;

                        // 1. Label Nama Ninja (gantikan "Sample Text" dengan nama asli dan warnai sesuai grade!)
                        var altTargets = [ctl.alt, this.alt, (this.scene && this.scene.controller ? this.scene.controller.alt : null)];
                        for (var a_i = 0; a_i < altTargets.length; a_i++) {
                            var altObj = altTargets[a_i];
                            if (altObj && typeof altObj.setString === "function") {
                                altObj.setString(ninjaName);
                                if (typeof altObj.setColor === "function") altObj.setColor(col);
                            }
                        }

                        // 2. Label Grade Ninja (gantikan "SS" dan beri warna sesuai grade: D=Gray, C=Green, B=Blue, A=Purple, S=Red, SS=Yellow, SSS=Purple, UR=Cyan)
                        var qTargets = [ctl.qualityTF, this.qualityTF];
                        for (var q_i = 0; q_i < qTargets.length; q_i++) {
                            var qObj = qTargets[q_i];
                            if (qObj && typeof qObj.setString === "function") {
                                qObj.setString(qGrade);
                                if (typeof qObj.setColor === "function") qObj.setColor(col);
                            }
                        }

                        // 3. Label Potensi Zhizi
                        var zTargets = [ctl.zhiziTF, this.zhiziTF];
                        for (var z_i = 0; z_i < zTargets.length; z_i++) {
                            var zObj = zTargets[z_i];
                            if (zObj) {
                                if (typeof PropertyTools !== "undefined" && PropertyTools.roleQualifications && rid) {
                                    try { zObj.setString(PropertyTools.roleQualifications(rid)); } catch(eZ) {}
                                }
                                if (typeof zObj.setColor === "function") zObj.setColor(col);
                            }
                        }

                        // 4. Label Level
                        var lvTargets = [ctl.lvTF, this.lvTF];
                        for (var l_i = 0; l_i < lvTargets.length; l_i++) {
                            var lvObj = lvTargets[l_i];
                            if (lvObj && typeof lvObj.setString === "function") {
                                lvObj.setString("Lv." + lv);
                            }
                        }

                        // 5. Ninjutsu Bawaan (Isi slot skill agar tidak kosong dari Grade D sampai UR!)
                        var sList = ctl.skillList || this.skillList;
                        if (sList && Array.isArray(sList)) {
                            var defSkill = (ro && (ro.special_jutsu || (ro.skill && ro.skill[0]))) ? (ro.special_jutsu || ro.skill[0]) : 1149;
                            var skills = (rd && rd.getSkillListAll) ? rd.getSkillListAll(key) : null;
                            if (!skills || !Array.isArray(skills) || skills.length === 0) {
                                skills = [{ id: defSkill, sid: defSkill, type: 1, idx: 0, star: 1, sstar: 1, quality: quality }];
                            }
                            for (var s_i = 0; s_i < sList.length; s_i++) {
                                var box = sList[s_i];
                                if (box && skills[s_i]) {
                                    if (typeof box.updataByRoledata === "function") {
                                        try { box.updataByRoledata(skills[s_i]); } catch(eBox) {}
                                    } else if (typeof box.updata === "function") {
                                        try { box.updata(skills[s_i].id || skills[s_i].sid || defSkill, skills[s_i].quality || quality, s_i); } catch(eBox2) {}
                                    }
                                }
                            }
                        }

                        // 6. Tombol X (Close Button) SELALU ENABLED DAN AMAN
                        if (ctl.closeBtn && typeof ctl.closeBtn.setEnabled === "function") {
                            ctl.closeBtn.setEnabled(true);
                        }
                        if (this.closeBtn && typeof this.closeBtn.setEnabled === "function") {
                            this.closeBtn.setEnabled(true);
                        }
                    } catch(eInf) {}
                    return ret;
                };
            }
        } catch(eInforGuard) {}

        // 2j. RoleData getSkillListAll: Guarantee authentic default ninjutsu object for all grades D..UR
        try {
            if (typeof RoleData !== "undefined" && RoleData.prototype && RoleData.prototype.getSkillListAll) {
                var _origGetSkillListAll = RoleData.prototype.getSkillListAll;
                RoleData.prototype.getSkillListAll = function(key) {
                    var list = null;
                    try {
                        list = _origGetSkillListAll ? _origGetSkillListAll.apply(this, arguments) : null;
                    } catch(eG) {}
                    try {
                        var rid = this.getRoleID(key) || (this.heros && this.heros[key] ? (this.heros[key].id || this.heros[key].rid) : null);
                        var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                        var ro = (cfg && cfg.roleObject && rid) ? cfg.roleObject[rid] : null;
                        var defSkill = (ro && (ro.special_jutsu || (ro.skill && ro.skill[0]))) ? (ro.special_jutsu || ro.skill[0]) : 1149;
                        var q = ro ? (ro.quality || 1) : 1;
                        var defObj = {
                            sid: defSkill,
                            id: defSkill,
                            type: 1,
                            idx: 0,
                            star: 1,
                            sstar: 1,
                            quality: q
                        };

                        if (!list || !Array.isArray(list) || list.length === 0) {
                            list = [defObj];
                        } else {
                            for (var k = 0; k < list.length; k++) {
                                if (typeof list[k] === "number") {
                                    list[k] = { sid: list[k], id: list[k], type: 1, idx: k, star: 1, sstar: 1, quality: q };
                                } else if (list[k] && typeof list[k] === "object" && !list[k].sid && !list[k].id) {
                                    list[k].sid = defSkill;
                                    list[k].id = defSkill;
                                    list[k].quality = q;
                                }
                            }
                            if (!list[0] || (!list[0].id && !list[0].sid)) {
                                list[0] = defObj;
                            }
                        }
                    } catch(eDefSkill) {}
                    return list;
                };
            }
        } catch(eSkillListGuard) {}

        // 2k. SkillBox updataByRoledata guard: accept numeric skills or fallback gracefully
        try {
            if (typeof SkillBox !== "undefined" && SkillBox.prototype && SkillBox.prototype.updataByRoledata) {
                var _origSkillBoxUpdataByRole = SkillBox.prototype.updataByRoledata;
                SkillBox.prototype.updataByRoledata = function(data) {
                    try {
                        if (typeof data === "number") {
                            data = { id: data, sid: data, type: 1, idx: (this.idx || 0), star: 1, sstar: 1, quality: 1 };
                        }
                    } catch(eSk) {}
                    return _origSkillBoxUpdataByRole.call(this, data);
                };
            }
        } catch(eSkillBoxGuard) {}

        // 2l. StartScene: Clean Switch Account / Logout button at top right
        try {
            if (typeof StartScene !== "undefined" && StartScene.prototype && StartScene.prototype.onEnter) {
                var _origStartOnEnter = StartScene.prototype.onEnter;
                StartScene.prototype.onEnter = function() {
                    var ret = _origStartOnEnter ? _origStartOnEnter.apply(this, arguments) : undefined;
                    try {
                        if (!this.__nhSwitchBtn && typeof cc !== "undefined" && cc.MenuItemLabel && cc.LabelTTF) {
                            this.__nhSwitchBtn = true;
                            var size = cc.Director.getInstance().getWinSize();
                            var lbl = cc.LabelTTF.create("Ganti Akun", "Helvetica", 20);
                            lbl.setColor(cc.c3b(255, 220, 100));
                            var item = cc.MenuItemLabel.create(lbl, function() {
                                try {
                                    if (typeof sys !== "undefined" && sys.localStorage) {
                                        sys.localStorage.removeItem("nh_active_account");
                                    }
                                    if (typeof GameConnection !== "undefined" && GameConnection.sessionClose) {
                                        GameConnection.sessionClose();
                                    }
                                    if (typeof MainView !== "undefined" && MainView.setPageView) {
                                        MainView.setPageView("login");
                                    }
                                } catch(eLogout) {}
                            }, this);
                            var menu = cc.Menu.create(item);
                            menu.setPosition(cc.p(size.width - 70, size.height - 30));
                            this.addChild(menu, 9999);
                        }
                    } catch(eStartBtn) {}
                    return ret;
                };
            }
        } catch(eStartGuard) {}

        // 2m. Safeguard modal close buttons (SelectRoleBox, InforNinJaScene, BeiBaoScene)
        try {
            if (typeof SelectRoleBox !== "undefined" && SelectRoleBox.prototype) {
                var _origSRBBuildUI = SelectRoleBox.prototype.buildUI;
                if (_origSRBBuildUI) {
                    SelectRoleBox.prototype.buildUI = function() {
                        var r = _origSRBBuildUI.apply(this, arguments);
                        try {
                            if (this.closeBtn && typeof this.closeBtn.setEnabled === "function") {
                                this.closeBtn.setEnabled(true);
                            }
                        } catch(eSRB) {}
                        return r;
                    };
                }
            }
        } catch(eCloseSafe) {}
    } catch (eRoleGuard) {
        if (typeof cc !== "undefined" && cc.log) cc.log("[NH Error] eRoleGuard: " + eRoleGuard);
    }
'''.replace('__JS_MN_LITERAL__', js_mn_literal)

ui_main_fixed = ui_main.replace(hook_marker, role_guard_code + '\n    ' + hook_marker)

# Repack APK
with zipfile.ZipFile('OkkaNHNE-Private.apk', 'r') as zin:
    with zipfile.ZipFile('temp_repack.apk', 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        existing_files = set()

        for item in zin.infolist():
            if item.filename.startswith('META-INF/'):
                continue
            if item.filename.startswith('assets/UI/image/iroleHead/'):
                continue
            if item.filename.startswith('assets/UI/image/iskillicon/'):
                continue
            existing_files.add(item.filename)

            if item.filename == 'assets/UI/main.js':
                zout.writestr(item, ui_main_fixed.encode('utf-8'))
            elif item.filename == 'assets/main.js':
                zout.writestr(item, ui_main_fixed.encode('utf-8'))
            else:
                zout.writestr(item, zin.read(item.filename))

        # Inject all ninja heads from public/images/ninja_heads/
        if os.path.exists('public/images/ninja_heads'):
            for fname in os.listdir('public/images/ninja_heads'):
                if fname.lower().endswith('.png'):
                    target_path = f'assets/UI/image/iroleHead/{fname}'
                    with open(os.path.join('public/images/ninja_heads', fname), 'rb') as hf:
                        zout.writestr(target_path, hf.read())
            print(f"[+] Injected authentic ninja head icons into assets/UI/image/iroleHead/")

        # Inject all skill icons from public/images/skills/
        if os.path.exists('public/images/skills'):
            for fname in os.listdir('public/images/skills'):
                if fname.lower().endswith('.png'):
                    target_path = f'assets/UI/image/iskillicon/{fname}'
                    with open(os.path.join('public/images/skills', fname), 'rb') as sf:
                        zout.writestr(target_path, sf.read())
            print(f"[+] Injected authentic skill icons into assets/UI/image/iskillicon/")

build_tools = r'C:\Users\Administrator\AppData\Local\Android\Sdk\build-tools\34.0.0'
apksigner = os.path.join(build_tools, 'apksigner.bat')
zipalign = os.path.join(build_tools, 'zipalign.exe')
keystore = os.path.expanduser('~/.android/debug.keystore')

if os.path.exists('aligned.apk'): os.remove('aligned.apk')
subprocess.run(f'"{zipalign}" -v -p 4 temp_repack.apk aligned.apk', shell=True, check=True, stdout=subprocess.DEVNULL)
subprocess.run(f'"{apksigner}" sign --ks "{keystore}" --ks-pass pass:android --key-pass pass:android --out OkkaNHNE-Private.apk aligned.apk', shell=True, check=True)

if os.path.exists('temp_repack.apk'): os.remove('temp_repack.apk')
if os.path.exists('aligned.apk'): os.remove('aligned.apk')

shutil.copy2('OkkaNHNE-Private.apk', 'OkkaNHNE-Private.zip')
os.makedirs('public/download', exist_ok=True)
shutil.copy2('OkkaNHNE-Private.apk', 'public/download/OkkaNHNE-Private.apk')
print("[+] Repacked, aligned, and signed OkkaNHNE-Private.apk and updated zip and public/download successfully!")
