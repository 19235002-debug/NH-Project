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
                qualityCol[1] = _c(180, 180, 180); // D - Gray
                qualityCol[2] = _c(80, 200, 100);   // C - Green
                qualityCol[3] = _c(50, 150, 255);  // B - Blue
                qualityCol[4] = _c(190, 60, 230);  // A - Purple
                qualityCol[5] = _c(245, 50, 50);   // S - Red
                qualityCol[6] = _c(255, 200, 20);  // SS - Gold/Yellow
                qualityCol[7] = _c(220, 50, 255);  // SSS - Bright Purple
                qualityCol[8] = _c(0, 210, 255);   // UR - Electric Blue / Cyan (#00d2ff)
                while (qualityCol.length <= 15) {
                    qualityCol.push(qualityCol[8]);
                }
            }
        } catch(eQual) {}

        // 2e-armature: Safeguard ArmatureLoad, RoleStopBox, and ArmatureTools against missing skeletal models
        try {
            var _VALID_ARMS = {
                "afei":1,"ai":1,"anbu1":1,"anbu2":1,"aomoyi":1,"asima":1,"bai":1,"ban":1,"banzang":1,
                "bingzuleitong":1,"buzhihuoxuanjian":1,"changshilang":1,"chitongkai":1,"chutian":1,
                "cilangfang":1,"dahe":1,"daitu":1,"daluyi":1,"dashedou":1,"dashewan":1,"dayemu":1,
                "didala":1,"dingci":1,"dou":1,"duoyouye":1,"erdaishuiying":1,"erweirenzhuli":1,
                "feiduan":1,"feijian":1,"fengyingwoailuo":1,"gangshou":1,"guijiao":1,"guitongwan":1,
                "hongdou":1,"huibisi":1,"jianmeicheng":1,"jiaodu":1,"jingye":1,"jingyin":1,"jinjiao":1,
                "jiuweimingren":1,"jue":1,"junmalv":1,"kai":1,"kakaxi":1,"kanjiulang":1,"karuyi":1,
                "liudaoban":1,"liudaodaitu":1,"liuweirenzhuli":1,"luwan":1,"maji":1,"mingren":1,
                "muyeshaobing":1,"muyeshouwei":1,"muyewan":1,"ningci":1,"peien":1,"qiandaipopo":1,
                "qilabi":1,"qing":1,"qiweirenzhuli":1,"quanzhongya":1,"sakedeng":1,"sandaihuoying":1,
                "sandaileiying":1,"sanweirenzhuli":1,"shanchengqingye":1,"shayinshaobing":1,
                "shayinshouwei":1,"shouju":1,"shuimen":1,"shuimu":1,"shuiyue":1,"sidaifengying":1,
                "siweirenzhuli":1,"tiantian":1,"tuanzang":1,"tuosizhen":1,"wanhuatongzuozhu":1,
                "weapon":1,"woailuo":1,"wu":1,"wuweirenzhuli":1,"wuyinshaobing":1,"wuyinshouwei":1,
                "xianglin":1,"xianrenmingren":1,"xiaoli":1,"xiaonan":1,"xiaoying":1,"xie":1,
                "xirihong":1,"yibixi":1,"yiluka":1,"yinjiao":1,"you":1,"yueguangjifeng":1,
                "zaibuzhan":1,"zhaomeiming":1,"zhinai":1,"zhongwu":1,"zhouyinzuozhu":1,"zhujian":1,
                "zilaiye":1,"zuojing":1,"zuojinyoujin":1,"zuozhu":1
            };

            if (typeof ArmatureLoad !== "undefined" && ArmatureLoad.prototype) {
                if (ArmatureLoad.prototype.addXML) {
                    var _origAddXML = ArmatureLoad.prototype.addXML;
                    ArmatureLoad.prototype.addXML = function(xmlfile) {
                        if (!xmlfile || !_VALID_ARMS[xmlfile]) {
                            xmlfile = "xianrenmingren";
                        }
                        return _origAddXML.call(this, xmlfile);
                    };
                }
                if (ArmatureLoad.prototype.setDataList) {
                    var _origSetDataList = ArmatureLoad.prototype.setDataList;
                    ArmatureLoad.prototype.setDataList = function(xmlfile) {
                        if (xmlfile && typeof xmlfile === "string" && !_VALID_ARMS[xmlfile]) {
                            xmlfile = "xianrenmingren";
                        }
                        return _origSetDataList.call(this, xmlfile);
                    };
                }
            }

            if (typeof RoleStopBox !== "undefined" && RoleStopBox.prototype) {
                var _origRSBUpdata = RoleStopBox.prototype.updata;
                RoleStopBox.prototype.updata = function(rid, b, cid, qlv) {
                    var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                    var ro = (cfg && cfg.roleObject) ? cfg.roleObject[rid] : null;
                    var origXml = ro ? ro.xmlfile : null;
                    if (ro && ro.xmlfile && !_VALID_ARMS[ro.xmlfile]) {
                        ro.xmlfile = "xianrenmingren";
                    }
                    var ret = _origRSBUpdata ? _origRSBUpdata.apply(this, arguments) : undefined;
                    if (ro && origXml) {
                        ro.xmlfile = origXml;
                    }
                    return ret;
                };

                if (RoleStopBox.prototype.addRole) {
                    var _origRSBAddRole = RoleStopBox.prototype.addRole;
                    RoleStopBox.prototype.addRole = function(rid) {
                        var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                        var ro = (cfg && cfg.roleObject) ? cfg.roleObject[rid] : null;
                        var origXml = ro ? ro.xmlfile : null;
                        if (ro && ro.xmlfile && !_VALID_ARMS[ro.xmlfile]) {
                            ro.xmlfile = "xianrenmingren";
                        }
                        var ret = _origRSBAddRole ? _origRSBAddRole.apply(this, arguments) : undefined;
                        if (ro && origXml) {
                            ro.xmlfile = origXml;
                        }
                        if (this.roleArmature) {
                            this.roleArmature.setVisible(true);
                            try {
                                var anim = this.roleArmature.getAnimation ? this.roleArmature.getAnimation() : null;
                                if (anim && typeof anim.play === "function") {
                                    anim.play("stand");
                                }
                            } catch(eAnim) {}
                        }
                        return ret;
                    };
                }
            }

            if (typeof ArmatureTools !== "undefined") {
                if (ArmatureTools.roleArmature) {
                    var _origRoleArmature = ArmatureTools.roleArmature;
                    ArmatureTools.roleArmature = function(rid) {
                        var arm = null;
                        var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                        var ro = (cfg && cfg.roleObject) ? cfg.roleObject[rid] : null;
                        var origXml = ro ? ro.xmlfile : null;

                        if (ro && ro.xmlfile && !_VALID_ARMS[ro.xmlfile]) {
                            ro.xmlfile = "xianrenmingren";
                        }

                        try {
                            arm = _origRoleArmature.apply(this, arguments);
                        } catch(eArm) {}

                        if (!arm && ro) {
                            ro.xmlfile = "xianrenmingren";
                            try { arm = _origRoleArmature.apply(this, arguments); } catch(eArm2) {}
                        }
                        if (!arm && ro) {
                            ro.xmlfile = "mingren";
                            try { arm = _origRoleArmature.apply(this, arguments); } catch(eArm3) {}
                        }

                        if (ro && origXml) {
                            ro.xmlfile = origXml;
                        }
                        return arm;
                    };
                }
            }

            if (typeof ccs !== "undefined" && ccs.Armature && ccs.Armature.create) {
                var _origArmatureCreate = ccs.Armature.create;
                ccs.Armature.create = function(name) {
                    try {
                        var adm = (ccs.ArmatureDataManager && ccs.ArmatureDataManager.getInstance) ? ccs.ArmatureDataManager.getInstance() : null;
                        if (adm && typeof adm.getArmatureData === "function") {
                            var armData = adm.getArmatureData(name);
                            if (!armData) {
                                if (adm.getArmatureData("xianrenmingren")) {
                                    return _origArmatureCreate.call(this, "xianrenmingren");
                                }
                                if (adm.getArmatureData("mingren")) {
                                    return _origArmatureCreate.call(this, "mingren");
                                }
                            }
                        }
                    } catch(eArmData) {}
                    try {
                        return _origArmatureCreate.apply(this, arguments);
                    } catch(eCreate) {
                        try { return _origArmatureCreate.call(this, "xianrenmingren"); } catch(eC2) {}
                        try { return _origArmatureCreate.call(this, "mingren"); } catch(eC3) {}
                    }
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

            if (ro.__nhRolesGuarded && ro[170] && ro[199] && ro[170].xmlfile === "ashuraotsusuki") return;
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

        // 2i. InforNinJaScene: Fix "Sample Text" to real Ninja Name, grade text color (D..UR), and default ninjutsu
        try {
            if (typeof InforNinJaScene !== "undefined" && InforNinJaScene.prototype) {
                var _origInforNinJaUpdata = InforNinJaScene.prototype.updata;
                InforNinJaScene.prototype.updata = function() {
                    var ret = _origInforNinJaUpdata ? _origInforNinJaUpdata.apply(this, arguments) : undefined;
                    try {
                        var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                        var key = this.curRoleKey || (rd ? rd.getCurrentKey() : null);
                        var rid = rd ? (rd.getRoleID(key) || (rd.heros && rd.heros[key] ? rd.heros[key].id : null)) : null;
                        var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                        var ro = (cfg && cfg.roleObject && rid) ? cfg.roleObject[rid] : null;
                        var quality = ro ? ro.quality : 1;
                        if (quality > 8) quality = 8;
                        if (quality < 1) quality = 1;

                        var col = (typeof qualityCol !== "undefined" && qualityCol[quality]) ? qualityCol[quality] : cc.c3b(255, 255, 255);
                        var qGrade = (typeof qualityIconlist !== "undefined" && qualityIconlist[quality]) ? qualityIconlist[quality] : "D";
                        var ninjaName = (ro && (ro.name || ro.alt)) ? (ro.name || ro.alt) : "Shinobi";

                        var ctl = this.controller || (this.scene ? this.scene.controller : null);
                        if (ctl) {
                            if (ctl.alt && typeof ctl.alt.setString === "function") {
                                ctl.alt.setString(ninjaName);
                                ctl.alt.setColor(col);
                            }
                            if (ctl.nameTF && typeof ctl.nameTF.setString === "function") {
                                ctl.nameTF.setString(ninjaName);
                                ctl.nameTF.setColor(col);
                            }
                            if (ctl.qualityTF && typeof ctl.qualityTF.setString === "function") {
                                ctl.qualityTF.setString(qGrade);
                                ctl.qualityTF.setColor(col);
                            }
                            if (ctl.zhiziTF && typeof ctl.zhiziTF.setColor === "function") {
                                ctl.zhiziTF.setColor(col);
                            }

                            if (ctl.skillList && ctl.skillList.length > 0) {
                                var s0 = ctl.skillList[0];
                                var defaultSkill = (ro && (ro.special_jutsu || (ro.skill && ro.skill[0]))) ? (ro.special_jutsu || ro.skill[0]) : 1149;
                                var sdata = {
                                    sid: defaultSkill,
                                    id: defaultSkill,
                                    type: 1,
                                    idx: 0,
                                    star: 1,
                                    quality: (ro && ro.quality) ? ro.quality : 1
                                };
                                if (typeof s0.updataByRoledata === "function") {
                                    try { s0.updataByRoledata(sdata); } catch(eUp0) {}
                                } else if (typeof s0.updata === "function") {
                                    try { s0.updata(defaultSkill, 1, 0); } catch(eUp0b) {}
                                }
                            }
                        }
                    } catch(eInf) {}
                    return ret;
                };
            }
        } catch(eInforGuard) {}

        // 2j. RoleData getSkillListAll: Guarantee default ninjutsu is present in slot 1
        try {
            if (typeof RoleData !== "undefined" && RoleData.prototype && RoleData.prototype.getSkillListAll) {
                var _origGetSkillListAll = RoleData.prototype.getSkillListAll;
                RoleData.prototype.getSkillListAll = function(key) {
                    var list = _origGetSkillListAll ? _origGetSkillListAll.apply(this, arguments) : null;
                    try {
                        var rid = this.getRoleID(key) || (this.heros && this.heros[key] ? this.heros[key].id : null);
                        var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                        var ro = (cfg && cfg.roleObject && rid) ? cfg.roleObject[rid] : null;
                        var defSkill = (ro && (ro.special_jutsu || (ro.skill && ro.skill[0]))) ? (ro.special_jutsu || ro.skill[0]) : 1149;
                        var defObj = {
                            sid: defSkill,
                            id: defSkill,
                            type: 1,
                            idx: 0,
                            star: 1,
                            quality: ro ? ro.quality : 1
                        };

                        if (!list || !Array.isArray(list) || list.length === 0) {
                            list = [defObj];
                        } else if (!list[0] || (typeof list[0] === "object" && !list[0].id && !list[0].sid)) {
                            list[0] = defObj;
                        }
                    } catch(eDefSkill) {}
                    return list;
                };
            }
        } catch(eSkillListGuard) {}

        // 2k. GainNinJaScene: Replace "Sample Text" with authentic ninja name & grade color
        try {
            if (typeof GainNinJaScene !== "undefined" && GainNinJaScene.prototype && GainNinJaScene.prototype.updata) {
                var _origGainNinJaUpdata = GainNinJaScene.prototype.updata;
                GainNinJaScene.prototype.updata = function(rid) {
                    var ret = _origGainNinJaUpdata ? _origGainNinJaUpdata.apply(this, arguments) : undefined;
                    try {
                        var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                        var ro = (cfg && cfg.roleObject && rid) ? cfg.roleObject[rid] : null;
                        var ninjaName = (ro && (ro.name || ro.alt)) ? (ro.name || ro.alt) : "Shinobi";
                        var quality = ro ? ro.quality : 1;
                        if (quality > 8) quality = 8;
                        var col = (typeof qualityCol !== "undefined" && qualityCol[quality]) ? qualityCol[quality] : cc.c3b(255, 255, 255);
                        var ctl = this.controller || (this.scene ? this.scene.controller : null);
                        if (ctl) {
                            if (ctl.alt && typeof ctl.alt.setString === "function") {
                                ctl.alt.setString(ninjaName);
                                ctl.alt.setColor(col);
                            }
                            if (ctl.nameTF && typeof ctl.nameTF.setString === "function") {
                                ctl.nameTF.setString(ninjaName);
                                ctl.nameTF.setColor(col);
                            }
                        }
                    } catch(eGain) {}
                    return ret;
                };
            }
        } catch(eGainGuard) {}
    } catch (eRoleGuard) {
        if (typeof cc !== "undefined" && cc.log) cc.log("[NH Error] eRoleGuard: " + eRoleGuard);
    }
'''.replace('__JS_MN_LITERAL__', js_mn_literal)

ui_main_fixed = ui_main.replace(hook_marker, role_guard_code + '\n    ' + hook_marker)

# Repack APK
with zipfile.ZipFile('OkkaNHNE-Private.apk', 'r') as zin:
    with zipfile.ZipFile('temp_repack.apk', 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        existing_files = set()
        xianren_xml = None
        xianren_plist = None
        xianren_png = None

        for item in zin.infolist():
            if item.filename.startswith('META-INF/'):
                continue
            if item.filename.startswith('assets/UI/image/iroleHead/'):
                continue
            if item.filename.startswith('assets/UI/image/iskillicon/'):
                continue
            if 'ashuraotsusuki' in item.filename or 'fukasaku' in item.filename:
                continue
            existing_files.add(item.filename)
            if item.filename == 'assets/armatures/resXML-iphonehd/xianrenmingren.xml':
                xianren_xml = zin.read(item.filename)
            elif item.filename == 'assets/armatures/resXML-iphonehd/xianrenmingren.plist':
                xianren_plist = zin.read(item.filename)
            elif item.filename == 'assets/armatures/resXML-iphonehd/xianrenmingren.png':
                xianren_png = zin.read(item.filename)

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

        # Provide armature assets for all custom ninjas if xianrenmingren available
        if xianren_xml and xianren_plist and xianren_png:
            needed_arms = set(['ashuraotsusuki', 'fukasaku', 'kidomarucursed', 'sakonukoncursed'])
            for v in compact_ninjas.values():
                if len(v) > 2 and v[2]:
                    needed_arms.add(v[2])
            injected_count = 0
            for custom_arm in sorted(needed_arms):
                xml_path = f'assets/armatures/resXML-iphonehd/{custom_arm}.xml'
                if xml_path not in existing_files:
                    c_xml = xianren_xml.replace(b'xianrenmingren', custom_arm.encode('utf-8'))
                    c_plist = xianren_plist.replace(b'xianrenmingren', custom_arm.encode('utf-8'))
                    zout.writestr(xml_path, c_xml)
                    zout.writestr(f'assets/armatures/resXML-iphonehd/{custom_arm}.plist', c_plist)
                    zout.writestr(f'assets/armatures/resXML-iphonehd/{custom_arm}.png', xianren_png)
                    injected_count += 1
            print(f"[+] Provided armature assets with internal name for {injected_count} custom ninjas")

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
