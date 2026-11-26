import zipfile
import subprocess
import os
import shutil
import json

print("=== Starting OkkaNHNE-Private Complete Patch & Repack ===")

# 1. Load compact master ninjas and skills mapping
with open('master_ninjas_compact.json', 'r', encoding='utf-8') as f:
    compact_ninjas = json.load(f)

with open('master_skills_compact.json', 'r', encoding='utf-8') as f:
    compact_skills = json.load(f)

js_mn_literal = json.dumps(compact_ninjas)
js_skills_literal = json.dumps(compact_skills)

# 2. Read existing main.js from clean APK (preserving authentic CCBIs)
src_apk_path = 'OkkaNHNE-Private-Clean.apk' if os.path.exists('OkkaNHNE-Private-Clean.apk') else 'OkkaNHNE-Private.apk'
with zipfile.ZipFile(src_apk_path, 'r') as zin:
    ui_main = zin.read('assets/UI/main.js').decode('utf-8', errors='ignore')

# Remove any previous role guard if present
if '// 2e. Safeguard Config.roleObject' in ui_main:
    start_idx = ui_main.find('    // 2e. Safeguard Config.roleObject')
    end_idx = ui_main.find('    // 2b. Neutralize TalkingData')
    ui_main = ui_main[:start_idx] + ui_main[end_idx:]

hook_marker = '// 2b. Neutralize TalkingData analytics & AppsFlyer native JNI bridges immediately'
assert hook_marker in ui_main, 'Hook marker not found in assets/UI/main.js!'

role_guard_code = '''    // 2e. Safeguard Config.roleObject, Config.skillObject, RoleData, SkillBox, ArmatureTools against missing/custom ninjas & skills
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
                qualityCol[2] = _c(80, 220, 100);   // C - Green
                qualityCol[3] = _c(60, 160, 255);  // B - Blue
                qualityCol[4] = _c(190, 60, 230);  // A - Purple
                qualityCol[5] = _c(245, 50, 50);   // S - Red
                qualityCol[6] = _c(255, 200, 20);  // SS - Gold/Yellow
                qualityCol[7] = _c(225, 60, 255);  // SSS - Bright Purple/Magenta (#dc32ff)
                qualityCol[8] = _c(0, 210, 255);   // UR - Electric Blue / Cyan (#00d2ff)
                while (qualityCol.length <= 15) {
                    qualityCol.push(qualityCol[8]);
                }
            }
        } catch(eQual) {}

        // Universal .split polyfill on Array and Number to safeguard engine chakra/string calls
        try {
            if (!Array.prototype.split) {
                Array.prototype.split = function(delim) {
                    return this.join(delim || ",").split(delim || ",");
                };
            }
            if (!Number.prototype.split) {
                Number.prototype.split = function(delim) {
                    return String(this).split(delim || ",");
                };
            }
        } catch(eSpl) {}

        // Safeguard RoleData getChakra and getChakraName
        try {
            if (typeof RoleData !== "undefined" && RoleData.prototype) {
                var _origGetChakra = RoleData.prototype.getChakra;
                RoleData.prototype.getChakra = function(key) {
                    var res = _origGetChakra ? _origGetChakra.apply(this, arguments) : null;
                    if (Array.isArray(res)) return res.join(",");
                    if (typeof res === "number") return String(res);
                    return res || "1";
                };
                var _origGetChakraName = RoleData.prototype.getChakraName;
                RoleData.prototype.getChakraName = function(val) {
                    var names = { 1: "Fire", 2: "Wind", 3: "Lightning", 4: "Earth", 5: "Water" };
                    var id = parseInt(val);
                    if (names[id]) return names[id];
                    if (_origGetChakraName) {
                        try { return _origGetChakraName.apply(this, arguments); } catch(e) {}
                    }
                    return "Fire";
                };
            }
        } catch(eRdChakra) {}

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
                        if (name.indexOf("quality_skill_") !== -1) {
                            return _origGetSF.call(this, "image/iicon/quality_skill_B.png");
                        }
                    }
                    return f;
                };
            }
        } catch(eBorder) {}

        // 2e-roleStopBox: Safeguard RoleStopBox updata so it never crashes calling scenes
        try {
            if (typeof RoleStopBox !== "undefined" && RoleStopBox.prototype) {
                if (!RoleStopBox.prototype.updata) {
                    RoleStopBox.prototype.updata = function(rid) {
                        try {
                            if (this.addRole) {
                                return this.addRole(rid);
                            }
                        } catch(e) {}
                    };
                } else {
                    var _origRSBUpdata = RoleStopBox.prototype.updata;
                    RoleStopBox.prototype.updata = function(rid) {
                        try {
                            return _origRSBUpdata.apply(this, arguments);
                        } catch(eRSB) {
                            if (typeof cc !== "undefined" && cc.log) cc.log("[RoleStopBox updata Handled]: " + eRSB);
                        }
                    };
                }
            }
        } catch(eRSBSafe) {}

        // 2e-armature: Safe ArmatureLoad & ArmatureTools fallbacks
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

        // 2e-builddata: Village Buildings Unlock - Remove "Lvl 99 OPEN" gate
        try {
            if (typeof BuildData !== "undefined" && BuildData.prototype) {
                BuildData.prototype.getOpenBuild = function(id) {
                    return true;
                };
                BuildData.prototype.getOpenBuildBoon = function(id) {
                    return true;
                };
                BuildData.prototype.getOpenLevel = function(id) {
                    return 1;
                };
                BuildData.prototype.getOpenLevelAll = function() {
                    return 1;
                };
                BuildData.prototype.getOpenBuildList = function() {
                    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
                };
            }

            if (typeof HomeBuild !== "undefined" && HomeBuild.prototype) {
                var _origHBBuildUI = HomeBuild.prototype.buildUI;
                HomeBuild.prototype.buildUI = function() {
                    var r = _origHBBuildUI ? _origHBBuildUI.apply(this, arguments) : undefined;
                    try {
                        if (this.lockIcon && typeof this.lockIcon.setVisible === "function") {
                            this.lockIcon.setVisible(false);
                        }
                        if (this.lvTF && typeof this.lvTF.setVisible === "function") {
                            this.lvTF.setVisible(false);
                        }
                        if (this.buildImg && typeof this.buildImg.setVisible === "function") {
                            this.buildImg.setVisible(true);
                        }
                    } catch(eHB) {}
                    return r;
                };
            }
        } catch(eBuildSafe) {}

        // 2e-loginbg: Login Screen Background Ensure Hook
        try {
            if (typeof LoginScene !== "undefined" && LoginScene.prototype) {
                var _origLoginInitUI = LoginScene.prototype.initUI;
                LoginScene.prototype.initUI = function(a) {
                    var res = undefined;
                    if (this.startInitUI) {
                        res = this.startInitUI(a);
                    } else if (_origLoginInitUI) {
                        res = _origLoginInitUI.apply(this, arguments);
                    }
                    try {
                        if (!this.getChildByTag(99999)) {
                            var winSize = (typeof cc !== "undefined" && cc.Director && cc.Director.getInstance) ? cc.Director.getInstance().getWinSize() : { width: 960, height: 640 };
                            var bgSpr = (typeof cc !== "undefined" && cc.Sprite) ? (cc.Sprite.create("image/ibg/bg_loginscene_ne.png") || cc.Sprite.create("image/ibg/bg_loginscene.png") || cc.Sprite.create("image/ibg/bg_login_nhr.png")) : null;
                            if (bgSpr) {
                                bgSpr.setTag(99999);
                                bgSpr.setPosition(winSize.width / 2, winSize.height / 2);
                                var sz = bgSpr.getContentSize();
                                if (sz.width > 0 && sz.height > 0) {
                                    var sx = winSize.width / sz.width;
                                    var sy = winSize.height / sz.height;
                                    bgSpr.setScale(Math.max(sx, sy));
                                }
                                this.addChild(bgSpr, -100);
                            }
                        }
                    } catch(eBg) {}
                    return res;
                };
            }
        } catch(eLoginSafe) {}

        var _MN = __JS_MN_LITERAL__;
        var _SKILLS = __JS_SKILLS_LITERAL__;

        var _polyFillAllSkills = function(so) {
            if (!so || typeof so !== "object") return;
            for (var sid in _SKILLS) {
                var s = _SKILLS[sid];
                if (!so[sid]) {
                    so[sid] = {
                        id: s.id,
                        sid: s.sid,
                        name: s.name,
                        alt: s.alt,
                        quality: s.quality,
                        icon: s.icon || "skill_001",
                        chakra: s.chakra || 1,
                        descDmg: s.descDmg || "",
                        desc: s.desc || "",
                        type: s.type || 1,
                        when: s.when || 2,
                        prob: s.prob || 20
                    };
                } else {
                    if (!so[sid].icon) so[sid].icon = s.icon || "skill_001";
                    if (!so[sid].quality && s.quality) so[sid].quality = s.quality;
                    if (!so[sid].alt && s.alt) so[sid].alt = s.alt;
                    if (!so[sid].name && s.name) so[sid].name = s.name;
                }
            }
        };

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

            for (var nid = 0; nid <= 1000; nid++) {
                var d = _MN[nid] || _MN[String(nid)];
                var specJ = d ? d[8] : 1149;
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
                    var rawChakra = d ? d[3] : 1;
                    if (Array.isArray(rawChakra)) rawChakra = rawChakra.join(",");
                    else rawChakra = String(rawChakra || 1);
                    clone.chakra = rawChakra;
                    clone.hp = d ? d[4] : 2000;
                    clone.att = d ? d[5] : 200;
                    clone.def = d ? d[6] : 200;
                    clone.agi = d ? d[7] : 200;
                    clone.special_jutsu = specJ;
                    clone.skill = [specJ];
                    ro[nid] = clone;
                } else {
                    if (d) {
                        ro[nid].name = d[0];
                        ro[nid].alt = d[0];
                        ro[nid].quality = d[1];
                        ro[nid].xmlfile = d[2];
                        var rawC = d[3];
                        if (Array.isArray(rawC)) rawC = rawC.join(",");
                        else rawC = String(rawC || 1);
                        ro[nid].chakra = rawC;
                        ro[nid].special_jutsu = specJ;
                    }
                    if (!ro[nid].special_jutsu) ro[nid].special_jutsu = specJ;
                    ro[nid].skill = [ro[nid].special_jutsu];
                }
            }
        };

        var _polyFillBuildings = function(bo) {
            if (!bo || typeof bo !== "object") return;
            for (var bid in bo) {
                var b = bo[bid];
                if (b) {
                    b.show = 1;
                    b.upLevel = "1|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95";
                }
            }
        };

        var _polyFillJingcaiHD = function(cfg) {
            if (!cfg) return;
            if (!cfg.jingcaiHDObject || typeof cfg.jingcaiHDObject !== "object") cfg.jingcaiHDObject = {};
            for (var jhd = 0; jhd <= 2000; jhd++) {
                if (!cfg.jingcaiHDObject[jhd]) {
                    cfg.jingcaiHDObject[jhd] = {
                        id: jhd,
                        name: "Activity",
                        type: 1,
                        type_: 1,
                        desc1: "",
                        giftValue: "0",
                        lv: 1,
                        val: 0
                    };
                }
            }
        };

        try {
            if (typeof Config !== "undefined" && Config.getInstance) {
                var cfgInst = Config.getInstance();
                if (cfgInst) {
                    if (cfgInst.roleObject) _polyFillAllRoles(cfgInst.roleObject);
                    if (cfgInst.skillObject) _polyFillAllSkills(cfgInst.skillObject);
                    if (cfgInst.buildingObject) _polyFillBuildings(cfgInst.buildingObject);
                    _polyFillJingcaiHD(cfgInst);
                }
        // Safeguard GameTools.jsonParse for Training.json & others
        try {
            if (typeof GameTools !== "undefined") {
                var _origJsonParse = GameTools.jsonParse;
                GameTools.jsonParse = function(path) {
                    var res = null;
                    try {
                        res = _origJsonParse ? _origJsonParse.apply(this, arguments) : null;
                    } catch(eJP) {}
                    if (path && path.indexOf("Training.json") !== -1) {
                        if (!res || !res["1"] || !res["1"].atkReduce) {
                            var mockTraining = {};
                            for (var tq = 1; tq <= 8; tq++) {
                                mockTraining[String(tq)] = {
                                    atkReduce: "1|2", atkRaise: "1|2",
                                    defReduce: "1|2", defRaise: "1|2",
                                    hpReduce: "1|2", hpRaise: "1|2",
                                    dexReduce: "1|2", dexRaise: "1|2",
                                    roleTrain: "1", quality: String(tq)
                                };
                            }
                            return mockTraining;
                        }
                    }
                    if (path && path.indexOf("NewGift.json") !== -1) {
                        if (!res || !res["1"]) {
                            var mockGifts = {};
                            for (var mg = 0; mg <= 2000; mg++) {
                                mockGifts[String(mg)] = {
                                    id: mg,
                                    name: "Activity",
                                    type: 1,
                                    type_: 1,
                                    desc1: "",
                                    giftValue: "0",
                                    lv: 1,
                                    val: 0
                                };
                            }
                            return mockGifts;
                        }
                    }
                    if (res && typeof res === "object") return res;
                    return {};
                };
            }
        } catch(eJPSafe) {}

        var _origInitJson = Config.prototype.initJson;
        if (_origInitJson) {
            Config.prototype.initJson = function() {
                var res = undefined;
                try {
                    res = _origInitJson.apply(this, arguments);
                } catch(eInitErr) {
                    if (typeof cc !== "undefined" && cc.log) cc.log("[Config initJson catch] " + eInitErr);
                }
                try {
                    if (this.roleObject) _polyFillAllRoles(this.roleObject);
                    if (this.skillObject) _polyFillAllSkills(this.skillObject);
                    if (this.buildingObject) _polyFillBuildings(this.buildingObject);
                    _polyFillJingcaiHD(this);
                } catch(ePoly) {}
                return res;
            };
        }
            }
        } catch(eCfgGuard) {}

        // 2j. RoleData getSkillListAll AND getSkillListType: Guarantee authentic default ninjutsu object for all grades D..UR
        var _resolveDefaultJutsu = function(rd, key) {
            var rdInst = rd || ((typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null);
            var k = key || (rdInst ? (rdInst.currentKey || rdInst.curRoleKey || (rdInst.getCurrentKey ? rdInst.getCurrentKey() : null)) : null);
            if (!k && rdInst && rdInst.heros) {
                for (var hk in rdInst.heros) {
                    if (rdInst.heros.hasOwnProperty(hk) && rdInst.heros[hk]) { k = hk; break; }
                }
            }
            var hero = (rdInst && rdInst.heros && k) ? (rdInst.heros[k] || rdInst.heros[String(k)] || rdInst.heros[parseInt(k)]) : null;
            var rid = hero ? (hero.id || hero.rid || hero.hid) : (rdInst && rdInst.getRoleID ? rdInst.getRoleID(k) : null);
            if (!rid && hero) rid = hero.id || hero.rid || hero.hid;
            if (!rid && typeof k === "number") rid = k;
            if (!rid && typeof k === "string" && !isNaN(parseInt(k))) rid = parseInt(k);

            var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
            var ro = (cfg && cfg.roleObject && rid) ? (cfg.roleObject[rid] || cfg.roleObject[String(rid)]) : null;
            var d_info = _MN[rid] || (rid ? _MN[String(rid)] : null);
            var defSkill = (ro && (ro.special_jutsu || (ro.skill && ro.skill[0]))) ? (ro.special_jutsu || ro.skill[0]) : (d_info ? d_info[8] : 1149);
            var q = (ro && typeof ro.quality !== "undefined") ? ro.quality : (hero ? hero.quality : (d_info ? d_info[1] : 1));
            if (q > 8) q = 8;
            if (q < 1) q = 1;
            return {
                id: defSkill,
                sid: defSkill,
                type: 1,
                idx: 0,
                star: 1,
                sstar: 1,
                quality: q
            };
        };

        var _patchSkills = function(ctx, explicitKey) {
            try {
                var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                var k = explicitKey || (ctx ? (ctx.currentKey || ctx.curRoleKey) : null) || (rd ? (rd.currentKey || (rd.getCurrentKey ? rd.getCurrentKey() : null)) : null);
                if (!k && rd && rd.heros) {
                    for (var hk in rd.heros) {
                        if (rd.heros.hasOwnProperty(hk) && rd.heros[hk]) { k = hk; break; }
                    }
                }
                var skillList = (ctx && ctx.skillList) ? ctx.skillList : ((ctx && ctx.inforNinJa) ? ctx.inforNinJa.skillList : null);
                if (typeof cc !== "undefined" && cc.log) {
                    cc.log("[PATCHSKILLS] k=" + k + " skillListLen=" + (skillList ? skillList.length : 0));
                    if (skillList) {
                        for (var di = 0; di < skillList.length; di++) {
                            var bObj = skillList[di];
                            cc.log("[SKILL ITEM " + di + "] ctor=" + (bObj && bObj.constructor ? bObj.constructor.name : "null") + " hasUpdata=" + (bObj && typeof bObj.updata));
                        }
                    }
                }
                if (!skillList || !skillList.length) return;

                // Tag all boxes with real slot index 0..7
                for (var ti = 0; ti < skillList.length; ti++) {
                    if (skillList[ti]) {
                        skillList[ti]._realSlotIdx = ti;
                        skillList[ti].boxSlotId = ti;
                        skillList[ti].target = ctx;
                    }
                }

                // Slot 0: ALWAYS gets authentic default special jutsu for this ninja
                var defData = _resolveDefaultJutsu(rd, k);
                if (typeof cc !== "undefined" && cc.log) cc.log("[DEFDATA] " + (defData ? JSON.stringify(defData) : "null"));
                if (skillList[0] && typeof skillList[0].updata === "function") {
                    skillList[0].updata(defData);
                }

                // Slots 1..7: keep clean empty swirls unless equipped
                var hero = (rd && rd.heros && k) ? (rd.heros[k] || rd.heros[String(k)] || rd.heros[parseInt(k)]) : null;
                for (var ei = 1; ei < skillList.length; ei++) {
                    var eBox = skillList[ei];
                    if (eBox && typeof eBox.updata === "function") {
                        var eq = (hero && hero.skill && hero.skill[ei]) ? hero.skill[ei] : null;
                        eBox.updata(eq);
                    }
                }
            } catch(ePS) {
                if (typeof cc !== "undefined" && cc.log) cc.log("[_patchSkills ERR]: " + ePS);
            }
        };

        try {
            if (typeof RoleData !== "undefined" && RoleData.prototype) {
                var _origGetSkillListAll = RoleData.prototype.getSkillListAll;
                RoleData.prototype.getSkillListAll = function(key) {
                    var list = null;
                    try {
                        if (_origGetSkillListAll) list = _origGetSkillListAll.apply(this, arguments);
                    } catch(eG) {}
                    try {
                        var k = key || this.currentKey || (this.getCurrentKey ? this.getCurrentKey() : null);
                        var defObj = _resolveDefaultJutsu(this, k);
                        if (!list || !Array.isArray(list) || list.length === 0) {
                            list = [defObj];
                        } else {
                            list[0] = defObj;
                        }
                    } catch(eDefSkill) {}
                    return list;
                };

                var _origGetSkillListType = RoleData.prototype.getSkillListType;
                RoleData.prototype.getSkillListType = function(type, key) {
                    var res = null;
                    try {
                        if (_origGetSkillListType) res = _origGetSkillListType.apply(this, arguments);
                    } catch(eT) {}
                    if (!type || type === 1) {
                        try {
                            var k2 = key || this.currentKey || (this.getCurrentKey ? this.getCurrentKey() : null);
                            var defObj2 = _resolveDefaultJutsu(this, k2);
                            if (!res || !Array.isArray(res) || res.length === 0) {
                                res = [defObj2];
                            } else {
                                res[0] = defObj2;
                            }
                        } catch(eDefSkill2) {}
                    }
                    return res;
                };

                var _origGetNinStar = RoleData.prototype.getNinSkillQualityAndStar;
                RoleData.prototype.getNinSkillQualityAndStar = function(rolekey, sid) {
                    var res = null;
                    try {
                        if (_origGetNinStar) res = _origGetNinStar.apply(this, arguments);
                    } catch(eN1) {}
                    if (!res) {
                        var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                        var sObj = (cfg && cfg.skillObject && sid) ? cfg.skillObject[sid] : (_SKILLS[sid] || null);
                        var q = (sObj && sObj.quality) ? sObj.quality : 1;
                        res = { star: 1, quality: q };
                    }
                    return res;
                };
            }
        } catch(eSkillListGuard) {}

        // 2k. SkillBox ctor, updata & updataByRoledata hook: Clean rendering, quality border, and authentic grade badge
        try {
            if (typeof SkillBox !== "undefined" && SkillBox.prototype) {
                var _origSkillBoxCtor = SkillBox.prototype.ctor;
                SkillBox.prototype.ctor = function(target, idx) {
                    if (typeof idx !== "undefined") {
                        this._realSlotIdx = idx;
                        this.boxSlotId = idx;
                    }
                    if (typeof target !== "undefined") this.target = target;
                    var r = _origSkillBoxCtor ? _origSkillBoxCtor.apply(this, arguments) : undefined;
                    if (typeof idx !== "undefined") {
                        this._realSlotIdx = idx;
                        this.boxSlotId = idx;
                    }
                    if (typeof target !== "undefined") this.target = target;
                    return r;
                };

                var _origSkillBoxUpdata = SkillBox.prototype.updata;
                SkillBox.prototype.updata = function(data) {
                    var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                    var cfgInst = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                    var gt = (typeof GameTools !== "undefined" && GameTools.getInstance) ? GameTools.getInstance() : null;

                    // Determine slot index reliably:
                    var slotIdx = -1;
                    if (typeof this._realSlotIdx !== "undefined") {
                        slotIdx = this._realSlotIdx;
                    } else if (typeof this.boxSlotId !== "undefined") {
                        slotIdx = this.boxSlotId;
                    } else if (this.target && this.target.skillList && Array.isArray(this.target.skillList)) {
                        slotIdx = this.target.skillList.indexOf(this);
                    }
                    if (typeof cc !== "undefined" && cc.log) cc.log("[SKILLBOX UPDATA] this=" + (this.constructor ? this.constructor.name : "SkillBox") + " target=" + (this.target ? (this.target.constructor ? this.target.constructor.name : "target") : "null") + " slotIdx=" + slotIdx + " data=" + (data ? JSON.stringify(data) : "null"));

                    // Always clean up custom tags 101, 102, 103 before redrawing
                    try {
                        if (this.removeChildByTag) {
                            this.removeChildByTag(101, true);
                            this.removeChildByTag(102, true);
                            this.removeChildByTag(103, true);
                        }
                    } catch(eRm) {}

                    // 1. Slot 0 MUST ALWAYS HAVE DEFAULT JUTSU!
                    if (slotIdx === 0) {
                        if (!data || (!data.sid && !data.id)) {
                            try {
                                var curK = (this.target ? (this.target.currentKey || this.target.curRoleKey) : null) || (rd ? (rd.currentKey || (rd.getCurrentKey ? rd.getCurrentKey() : null)) : null);
                                data = _resolveDefaultJutsu(rd, curK);
                            } catch(eDef) {}
                        }
                    }

                    // 2. Empty slot (slotIdx > 0 or unknown without data)
                    if (!data || (!data.sid && !data.id)) {
                        try {
                            if (this.showMC0 && typeof this.showMC0.setVisible === "function") {
                                this.showMC0.setVisible(true);
                            }
                            if (this.showMC && typeof this.showMC.setVisible === "function") {
                                this.showMC.setVisible(false);
                            }
                        } catch(eEmpty) {}
                        return; // Do NOT call original with null!
                    }

                    // 3. Normalize data
                    var sid = data.sid || data.id;
                    if (typeof sid === "string") sid = parseInt(sid);

                    if (sid && cfgInst && cfgInst.skillObject) {
                        try {
                            if (!cfgInst.skillObject[sid] && _SKILLS[sid]) {
                                cfgInst.skillObject[sid] = _SKILLS[sid];
                                cfgInst.skillObject[String(sid)] = _SKILLS[sid];
                            }
                            if (cfgInst.skillObject[sid]) {
                                if (!cfgInst.skillObject[sid].icon) cfgInst.skillObject[sid].icon = "skill_001";
                                if (!data.quality && cfgInst.skillObject[sid].quality) {
                                    data.quality = cfgInst.skillObject[sid].quality;
                                }
                            }
                        } catch(ePre) {}
                    }

                    // Call original safely
                    if (_origSkillBoxUpdata) {
                        try {
                            _origSkillBoxUpdata.call(this, data);
                        } catch(eUp) {}
                    }

                    // 4. Force authentic visual rendering centered exactly on SkillBox (0, 0)
                    try {
                        var sObj = (cfgInst && cfgInst.skillObject && cfgInst.skillObject[sid]) || _SKILLS[sid] || null;
                        var iconName = (sObj && sObj.icon) ? sObj.icon : "skill_001";
                        var qual = data.quality || (sObj ? sObj.quality : 1);
                        if (qual > 8) qual = 8;
                        if (qual < 1) qual = 1;

                        // Hide default empty swirl & default empty frame
                        if (this.showMC0 && typeof this.showMC0.setVisible === "function") {
                            this.showMC0.setVisible(false);
                        }
                        if (this.showMC && typeof this.showMC.setVisible === "function") {
                            this.showMC.setVisible(false);
                        }

                        // Coordinates: In Cocos2d-x SkillBox, the center is (0, 0)
                        var cx = 0;
                        var cy = 0;

                        // Icon (Tag 101)
                        var spr = null;
                        if (typeof cc !== "undefined" && cc.Sprite) {
                            spr = cc.Sprite.create("image/iskillicon/" + iconName + ".png") || cc.Sprite.create("image/iskillicon/skill_001.png");
                        }
                        if (spr) {
                            spr.setTag(101);
                            spr.setPosition(cx, cy);
                            this.addChild(spr, 1);
                        }

                        // Quality border (Tag 102)
                        var qBadge = (typeof qualityIconlist !== "undefined" && qualityIconlist[qual]) ? qualityIconlist[qual] : "D";
                        var borderFrameName = (qual === 8) ? "image/iicon/quality_skill_B.png" : ("image/iicon/quality_skill_" + qBadge + ".png");
                        var borderSpr = null;
                        if (gt && typeof gt.getSpritePlist === "function") {
                            borderSpr = gt.getSpritePlist(borderFrameName);
                        }
                        if (!borderSpr && typeof cc !== "undefined" && cc.SpriteFrameCache) {
                            var sf = cc.SpriteFrameCache.getInstance().getSpriteFrame(borderFrameName);
                            if (sf) borderSpr = cc.Sprite.createWithSpriteFrame(sf);
                        }
                        if (!borderSpr && typeof cc !== "undefined" && cc.Sprite) {
                            borderSpr = cc.Sprite.create(borderFrameName);
                        }
                        if (borderSpr) {
                            borderSpr.setTag(102);
                            borderSpr.setPosition(cx, cy);
                            this.addChild(borderSpr, 2);
                        }

                        // Grade badge text (Tag 103)
                        var col = (typeof qualityCol !== "undefined" && qualityCol[qual]) ? qualityCol[qual] : cc.c3b(255, 255, 255);
                        var badgeLabel = null;
                        if (typeof cc !== "undefined" && cc.LabelTTF) {
                            badgeLabel = cc.LabelTTF.create(qBadge, "Arial", 16);
                            if (badgeLabel) {
                                badgeLabel.setColor(col);
                                badgeLabel.setTag(103);
                                badgeLabel.setPosition(cx + 20, cy - 20);
                                this.addChild(badgeLabel, 3);
                            }
                        }
                    } catch(eRender) {
                        try { cc.log("[SKILLBOX_ERR] " + eRender); } catch(eL2) {}
                    }
                };

                // updataByRoledata delegates directly to updata
                SkillBox.prototype.updataByRoledata = function(data) {
                    try {
                        return this.updata(data);
                    } catch(eRole) {}
                };
            }
        } catch(eSkillBoxGuard) {}

        // 2l. RoleStopBox hook: Guarantee authentic Chibi animated ninja model in the center pedestal
        try {
            if (typeof RoleStopBox !== "undefined" && RoleStopBox.prototype) {
                var _origRoleStopBoxUpdata = RoleStopBox.prototype.updata;
                RoleStopBox.prototype.updata = function(keyOrRid) {
                    var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                    var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                    var rid = null;

                    // 1. Resolve via RoleData hero key FIRST!
                    if (rd && rd.heros && (rd.heros[keyOrRid] || rd.heros[String(keyOrRid)])) {
                        var h = rd.heros[keyOrRid] || rd.heros[String(keyOrRid)];
                        rid = h ? (h.id || h.rid || h.hid) : null;
                    }
                    if (!rid && rd && rd.getRoleID) {
                        try { rid = rd.getRoleID(keyOrRid); } catch(eG) {}
                    }

                    // 2. Direct role ID
                    if (!rid) {
                        if (keyOrRid && ((cfg && cfg.roleObject && cfg.roleObject[keyOrRid]) || _MN[keyOrRid] || _MN[String(keyOrRid)])) {
                            rid = parseInt(keyOrRid);
                        } else if (typeof keyOrRid === "number" && keyOrRid > 10) {
                            rid = keyOrRid;
                        }
                    }

                    // 3. Fallback to rd.currentKey
                    if (!rid && rd && (rd.currentKey || (rd.getCurrentKey ? rd.getCurrentKey() : null))) {
                        var ck = rd.currentKey || rd.getCurrentKey();
                        if (rd.heros && (rd.heros[ck] || rd.heros[String(ck)])) {
                            var h2 = rd.heros[ck] || rd.heros[String(ck)];
                            rid = h2 ? (h2.id || h2.rid || h2.hid) : null;
                        }
                        if (!rid && rd.getRoleID) {
                            try { rid = rd.getRoleID(ck); } catch(eCk) {}
                        }
                    }

                    // 4. Fallback to first hero
                    if (!rid && rd && rd.heros) {
                        for (var hk in rd.heros) {
                            if (rd.heros.hasOwnProperty(hk) && rd.heros[hk]) {
                                rid = rd.heros[hk].id || rd.heros[hk].rid;
                                if (rid) break;
                            }
                        }
                    }

                    if (!rid) rid = 107;
                    this.key = keyOrRid;

                    if (this.roleBox && typeof this.roleBox.updata === "function") {
                        try {
                            this.roleBox.updata(rid);
                        } catch(eRb) {}
                    }
                    if (_origRoleStopBoxUpdata) {
                        try {
                            _origRoleStopBoxUpdata.call(this, rid);
                        } catch(eOrig) {}
                    }
                };
            }
        } catch(eRsbGuard) {}

        // 2m. SelectRoleBox & InforNinJaScene & ZhuangBeiScene unified UI hook
        _patchRoleUI = function(ctx, explicitKey) {
            try {
                var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                var key = explicitKey || (ctx ? (ctx.currentKey || ctx.curRoleKey) : null) || (rd ? (rd.currentKey || (rd.getCurrentKey ? rd.getCurrentKey() : null)) : null);
                if (!key && rd && rd.heros) {
                    for (var hk in rd.heros) {
                        if (rd.heros.hasOwnProperty(hk) && rd.heros[hk]) { key = hk; break; }
                    }
                }
                var hero = (rd && rd.heros && key) ? (rd.heros[key] || rd.heros[String(key)] || rd.heros[parseInt(key)]) : null;
                var rid = hero ? (hero.id || hero.rid || hero.hid) : (rd && rd.getRoleID ? rd.getRoleID(key) : null);
                if (!rid && hero) rid = hero.id || hero.rid || hero.hid;
                if (!rid && typeof key === "number") rid = key;
                if (!rid && typeof key === "string" && !isNaN(parseInt(key))) rid = parseInt(key);

                var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                var ro = (cfg && cfg.roleObject && rid) ? (cfg.roleObject[rid] || cfg.roleObject[String(rid)]) : null;
                var d_info = _MN[rid] || (rid ? _MN[String(rid)] : null);
                var quality = (ro && typeof ro.quality !== "undefined") ? ro.quality : (hero ? hero.quality : (d_info ? d_info[1] : 1));
                if (quality > 8) quality = 8;
                if (quality < 1) quality = 1;

                var col = (typeof qualityCol !== "undefined" && qualityCol[quality]) ? qualityCol[quality] : cc.c3b(255, 255, 255);
                var qGrade = (typeof qualityIconlist !== "undefined" && qualityIconlist[quality]) ? qualityIconlist[quality] : "D";
                var ninjaName = (ro && (ro.name || ro.alt)) ? (ro.name || ro.alt) : (d_info ? d_info[0] : (hero ? hero.name : "Shinobi"));
                var lv = hero ? hero.lv : (ro ? (ro.lv || 1) : 1);

                var ctl = ctx.controller || ctx;

                // 1. Ninja Name
                var altTargets = [ctx.alt, ctl.alt, (ctx.scene && ctx.scene.controller ? ctx.scene.controller.alt : null)];
                for (var a_i = 0; a_i < altTargets.length; a_i++) {
                    var altObj = altTargets[a_i];
                    if (altObj && typeof altObj.setString === "function") {
                        altObj.setString(ninjaName);
                        if (typeof altObj.setColor === "function") altObj.setColor(col);
                    }
                }

                // 2. Grade text
                var qTargets = [ctx.qualityTF, ctl.qualityTF, (ctx.scene && ctx.scene.controller ? ctx.scene.controller.qualityTF : null)];
                for (var q_i = 0; q_i < qTargets.length; q_i++) {
                    var qObj = qTargets[q_i];
                    if (qObj && typeof qObj.setString === "function") {
                        qObj.setString(qGrade);
                        if (typeof qObj.setColor === "function") qObj.setColor(col);
                    }
                }

                // 3. Qualification zhizi
                var zTargets = [ctx.zhiziTF, ctl.zhiziTF, (ctx.scene && ctx.scene.controller ? ctx.scene.controller.zhiziTF : null)];
                for (var z_i = 0; z_i < zTargets.length; z_i++) {
                    var zObj = zTargets[z_i];
                    if (zObj) {
                        if (typeof PropertyTools !== "undefined" && PropertyTools.roleQualifications && rid) {
                            try { zObj.setString(PropertyTools.roleQualifications(rid)); } catch(eZ) {}
                        } else if (hero && hero.quality) {
                            try { zObj.setString(hero.quality); } catch(eZ2) {}
                        }
                        if (typeof zObj.setColor === "function") zObj.setColor(col);
                    }
                }

                // 4. Combat Power
                var power = hero ? (hero.power || hero.combatPower) : (rd && rd.getPower ? rd.getPower(key) : null);
                if (power) {
                    var pTargets = [ctx.powerTF, ctl.powerTF, (ctx.scene && ctx.scene.controller ? ctx.scene.controller.powerTF : null)];
                    for (var p_i = 0; p_i < pTargets.length; p_i++) {
                        var pObj = pTargets[p_i];
                        if (pObj && typeof pObj.setString === "function") {
                            pObj.setString(power);
                        }
                    }
                }

                // 5. Level
                var lvTargets = [ctx.lvTF, ctl.lvTF, (ctx.scene && ctx.scene.controller ? ctx.scene.controller.lvTF : null)];
                for (var l_i = 0; l_i < lvTargets.length; l_i++) {
                    var lvObj = lvTargets[l_i];
                    if (lvObj && typeof lvObj.setString === "function") {
                        lvObj.setString("Lv." + lv);
                    }
                }

                // 6. Attributes (att, def, hp, agi)
                if (hero) {
                    if (ctx.attTF && hero.att && typeof ctx.attTF.setString === "function") ctx.attTF.setString(hero.att);
                    if (ctx.defTF && hero.def && typeof ctx.defTF.setString === "function") ctx.defTF.setString(hero.def);
                    if (ctx.hpTF && hero.hp && typeof ctx.hpTF.setString === "function") ctx.hpTF.setString(hero.hp);
                    if (ctx.agiTF && hero.agi && typeof ctx.agiTF.setString === "function") ctx.agiTF.setString(hero.agi);
                }

                // 7. Center model
                if (ctx.roleStopBox && typeof ctx.roleStopBox.updata === "function") {
                    ctx.roleStopBox.updata(key);
                }

                // 8. Close button (ensure enabled & responsive)
                var _bindCloseBtn = function(btn, targetCtx) {
                    if (!btn) return;
                    if (typeof btn.setEnabled === "function") btn.setEnabled(true);
                    if (typeof btn.setVisible === "function") btn.setVisible(true);
                    if (!btn._nhCloseBound) {
                        btn._nhCloseBound = true;
                        btn._touchEnded = function() {
                            try {
                                if (targetCtx && targetCtx.onRemoveMe) targetCtx.onRemoveMe();
                                else if (targetCtx && targetCtx.closeBtnCallBack) targetCtx.closeBtnCallBack();
                                else if (targetCtx && targetCtx.removeFromParent) targetCtx.removeFromParent(true);
                            } catch(eC1) {
                                try { if (targetCtx && targetCtx.removeFromParent) targetCtx.removeFromParent(true); } catch(eC2) {}
                            }
                        };
                    }
                };
                _bindCloseBtn(ctl.closeBtn, ctx);
                _bindCloseBtn(ctx.closeBtn, ctx);
            } catch(ePatch) {}
        };

        // Hook ZhuangBeiScene (Ninja screen opened from village)
        try {
            if (typeof ZhuangBeiScene !== "undefined" && ZhuangBeiScene.prototype) {
                if (ZhuangBeiScene.prototype.initSkillList) {
                    var _origZBSInitSkillList = ZhuangBeiScene.prototype.initSkillList;
                    ZhuangBeiScene.prototype.initSkillList = function() {
                        var r = _origZBSInitSkillList ? _origZBSInitSkillList.apply(this, arguments) : undefined;
                        try {
                            if (this.skillList && this.skillList.length) {
                                for (var i = 0; i < this.skillList.length; i++) {
                                    if (this.skillList[i]) {
                                        this.skillList[i]._realSlotIdx = i;
                                        this.skillList[i].boxSlotId = i;
                                        this.skillList[i].target = this;
                                    }
                                }
                            }
                        } catch(eISL) {}
                        return r;
                    };
                }

                if (ZhuangBeiScene.prototype.showSkillList) {
                    var _origZBSShowSkillList = ZhuangBeiScene.prototype.showSkillList;
                    ZhuangBeiScene.prototype.showSkillList = function() {
                        var r = _origZBSShowSkillList ? _origZBSShowSkillList.apply(this, arguments) : undefined;
                        try {
                            if (this.skillList && this.skillList.length) {
                                for (var i = 0; i < this.skillList.length; i++) {
                                    if (this.skillList[i]) {
                                        this.skillList[i]._realSlotIdx = i;
                                        this.skillList[i].boxSlotId = i;
                                        this.skillList[i].target = this;
                                    }
                                }
                            }
                            _patchRoleUI(this, this.currentKey);
                            _patchSkills(this, this.currentKey);
                        } catch(eSSL) {}
                        return r;
                    };
                }

                if (ZhuangBeiScene.prototype.onChangeRoleData) {
                    var _origZBSChange = ZhuangBeiScene.prototype.onChangeRoleData;
                    ZhuangBeiScene.prototype.onChangeRoleData = function(arg) {
                        var k = (typeof arg === "string" || typeof arg === "number") ? arg : (arg && arg.key ? arg.key : (arg && arg.currentKey ? arg.currentKey : (this.currentKey || null)));
                        if (!k) {
                            var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                            if (rd && rd.getCurrentKey) k = rd.getCurrentKey();
                            if (!k && rd) k = rd.currentKey;
                        }
                        if (k) this.currentKey = k;

                        if (this.skillList && this.skillList.length) {
                            for (var i = 0; i < this.skillList.length; i++) {
                                if (this.skillList[i]) {
                                    this.skillList[i]._realSlotIdx = i;
                                    this.skillList[i].boxSlotId = i;
                                    this.skillList[i].target = this;
                                }
                            }
                        }
                        var r = undefined;
                        try { r = _origZBSChange.apply(this, arguments); } catch(eZ1) {}
                        try {
                            var curK = this.currentKey || k;
                            _patchRoleUI(this, curK);
                            _patchSkills(this, curK);
                        } catch(eZ2) {}
                        return r;
                    };
                }

                if (ZhuangBeiScene.prototype.tableCellTouched) {
                    var _origZBSTouch = ZhuangBeiScene.prototype.tableCellTouched;
                    ZhuangBeiScene.prototype.tableCellTouched = function(table, cell) {
                        var r = undefined;
                        if (_origZBSTouch) {
                            try { r = _origZBSTouch.apply(this, arguments); } catch(eT1) {}
                        }
                        try {
                            var curK = this.currentKey;
                            if (!curK) {
                                var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                                if (rd && rd.getCurrentKey) curK = rd.getCurrentKey();
                            }
                            _patchRoleUI(this, curK);
                            _patchSkills(this, curK);
                        } catch(eT2) {}
                        return r;
                    };
                }

                if (ZhuangBeiScene.prototype.refreshNija) {
                    var _origZBSRefresh = ZhuangBeiScene.prototype.refreshNija;
                    ZhuangBeiScene.prototype.refreshNija = function(arg) {
                        var k = (typeof arg === "string" || typeof arg === "number") ? arg : (arg && arg.key ? arg.key : null);
                        if (k) {
                            this.currentKey = k;
                            var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                            if (rd) rd.currentKey = k;
                        }
                        var r = undefined;
                        try { r = _origZBSRefresh.apply(this, arguments); } catch(eZ2) {}
                        _patchRoleUI(this, k);
                        _patchSkills(this, k);
                        return r;
                    };
                }
            }
        } catch(eZBSGuard) {}

        // Hook SelectRoleBox (Lineup -> Choose Ninja)
        try {
            if (typeof SelectRoleBox !== "undefined" && SelectRoleBox.prototype) {
                var _origSRBTableCellTouched = SelectRoleBox.prototype.tableCellTouched;
                SelectRoleBox.prototype.tableCellTouched = function(table, cell) {
                    var r = undefined;
                    if (_origSRBTableCellTouched) {
                        try { r = _origSRBTableCellTouched.apply(this, arguments); } catch(eT1) {}
                    }
                    try {
                        if (this.headList && cell) {
                            var idx = cell.getIdx ? cell.getIdx() : 0;
                            var item = this.headList[idx];
                            var k = item ? item.key : null;
                            if (k && this.inforNinJa) {
                                if (typeof this.inforNinJa.updata === "function") this.inforNinJa.updata(k);
                                _patchRoleUI(this.inforNinJa, k);
                                _patchSkills(this.inforNinJa, k);
                            }
                        }
                    } catch(eT2) {}
                    return r;
                };
            }
        } catch(eSRBGuard) {}

        // Hook InforNinJaScene
        try {
            if (typeof InforNinJaScene !== "undefined" && InforNinJaScene.prototype) {
                var _origInforNinJaBuildUI = InforNinJaScene.prototype.buildUI;
                InforNinJaScene.prototype.buildUI = function() {
                    var r = _origInforNinJaBuildUI ? _origInforNinJaBuildUI.apply(this, arguments) : undefined;
                    try {
                        if (this.skillList && this.skillList.length) {
                            for (var bi = 0; bi < this.skillList.length; bi++) {
                                if (this.skillList[bi]) {
                                    this.skillList[bi]._realSlotIdx = bi;
                                    this.skillList[bi].boxSlotId = bi;
                                    this.skillList[bi].target = this;
                                }
                            }
                        }
                    } catch(eB) {}
                    return r;
                };

                var _origInforNinJaUpdata = InforNinJaScene.prototype.updata;
                InforNinJaScene.prototype.updata = function(key) {
                    this.curRoleKey = key;
                    var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                    if (rd && key) rd.currentKey = key;

                    if (this.skillList && this.skillList.length) {
                        for (var si = 0; si < this.skillList.length; si++) {
                            if (this.skillList[si]) {
                                this.skillList[si]._realSlotIdx = si;
                                this.skillList[si].boxSlotId = si;
                                this.skillList[si].target = this;
                            }
                        }
                    }

                    var ret = undefined;
                    if (_origInforNinJaUpdata) {
                        try { ret = _origInforNinJaUpdata.apply(this, arguments); } catch(eOrig) {}
                    }

                    try {
                        var k = key || this.curRoleKey;
                        _patchRoleUI(this, k);
                        _patchSkills(this, k);
                    } catch(eInf) {}
                    return ret;
                };
            }
        } catch(eInforGuard) {}

        // 2n. Universal tableCellAtIndex & cell updata safeguards to prevent native SIGSEGV
        try {
            var _protectTable = function(obj, name) {
                if (!obj || !obj.prototype) return;
                var proto = obj.prototype;
                if (typeof proto.tableCellAtIndex === "function") {
                    var _origTC = proto.tableCellAtIndex;
                    proto.tableCellAtIndex = function(table, idx) {
                        var cell = null;
                        try {
                            cell = _origTC.apply(this, arguments);
                        } catch(eTC) {
                            if (typeof cc !== "undefined" && cc.log) cc.log("[" + name + " tableCellAtIndex catch] " + eTC);
                        }
                        if (!cell) {
                            try {
                                if (table && table.dequeueCell) cell = table.dequeueCell();
                            } catch(eD) {}
                        }
                        if (!cell) {
                            try {
                                if (typeof RoleListRow !== "undefined") cell = new RoleListRow();
                                else if (typeof CustomTableViewCell !== "undefined") cell = new CustomTableViewCell();
                                else if (typeof CCTableViewCell !== "undefined") cell = new CCTableViewCell();
                            } catch(eN) {}
                        }
                        return cell;
                    };
                }
            };

            _protectTable(typeof RoleListView !== "undefined" ? RoleListView : null, "RoleListView");
            _protectTable(typeof SelectRoleBox !== "undefined" ? SelectRoleBox : null, "SelectRoleBox");
            _protectTable(typeof ZhuangBeiScene !== "undefined" ? ZhuangBeiScene : null, "ZhuangBeiScene");
            _protectTable(typeof TableViewLabel !== "undefined" ? TableViewLabel : null, "TableViewLabel");

            if (typeof RoleListCell !== "undefined" && RoleListCell.prototype && RoleListCell.prototype.updata) {
                var _origRLCUpdata = RoleListCell.prototype.updata;
                RoleListCell.prototype.updata = function(data) {
                    try {
                        return _origRLCUpdata.apply(this, arguments);
                    } catch(eRLC) {
                        if (typeof cc !== "undefined" && cc.log) cc.log("[RoleListCell updata catch] " + eRLC);
                    }
                };
            }
            if (typeof RoleHeadBox !== "undefined" && RoleHeadBox.prototype && RoleHeadBox.prototype.updata) {
                var _origRHBUpdata = RoleHeadBox.prototype.updata;
                RoleHeadBox.prototype.updata = function(data) {
                    try {
                        return _origRHBUpdata.apply(this, arguments);
                    } catch(eRHB) {
                        if (typeof cc !== "undefined" && cc.log) cc.log("[RoleHeadBox updata catch] " + eRHB);
                    }
                };
            }
        } catch(eTableGuards) {}

        // 2m. SelectRoleBox & Lineup close buttons and font colors
        try {
            if (typeof SelectRoleBox !== "undefined" && SelectRoleBox.prototype) {
                var _origSRBBuildUI = SelectRoleBox.prototype.buildUI;
                if (_origSRBBuildUI) {
                    SelectRoleBox.prototype.buildUI = function() {
                        var r = _origSRBBuildUI.apply(this, arguments);
                        try {
                            if (this.closeBtn) {
                                if (typeof this.closeBtn.setEnabled === "function") {
                                    this.closeBtn.setEnabled(true);
                                }
                                var srbSelf = this;
                                this.closeBtn._touchEnded = function() {
                                    try {
                                        if (srbSelf.onRemoveMe) srbSelf.onRemoveMe();
                                        else srbSelf.removeFromParent(true);
                                    } catch(eC1) {
                                        try { srbSelf.removeFromParent(true); } catch(eC2) {}
                                    }
                                };
                            }
                        } catch(eSRB) {}
                        return r;
                    };
                }
            }
        } catch(eCloseSafe) {}

        // 2p. NinJaRoomScene Arena population hook: Ensure 10 ninjas always stand on arena floor
        try {
            if (typeof NinJaRoomScene !== "undefined" && NinJaRoomScene.prototype) {
                var _origLoadRole = NinJaRoomScene.prototype.loadRole;
                NinJaRoomScene.prototype.loadRole = function() {
                    try {
                        if (!this.loadRoleList || !Array.isArray(this.loadRoleList) || this.loadRoleList.length < 5) {
                            // Authentic pool of ninjas that always have armatures in game
                            this.loadRoleList = [1, 2, 3, 4, 5, 9, 17, 107, 170, 11];
                        }
                    } catch(eLRPre) {}
                    var r = undefined;
                    if (_origLoadRole) {
                        try { r = _origLoadRole.apply(this, arguments); } catch(eLR) {}
                    }
                    return r;
                };

                // Prevent any unhandled errors in claw drop / escape animation
                if (NinJaRoomScene.prototype.sibai) {
                    var _origSibai = NinJaRoomScene.prototype.sibai;
                    NinJaRoomScene.prototype.sibai = function() {
                        try {
                            return _origSibai.apply(this, arguments);
                        } catch(eSib) {
                            try {
                                if (this.shibai && typeof this.shibai.setVisible === "function") {
                                    this.shibai.setVisible(false);
                                }
                                if (this.gotoOver) this.gotoOver();
                            } catch(eSib2) {}
                        }
                    };
                }
            }
        } catch(eNRPatch) {}

        // 2q. GainNinJaCCB Popup Dialog Hook: Fix Sample Text, empty jutsu box, and unclickable OK / Ignore buttons
        var _patchGainNinjaNode = function(node, data) {
            try {
                if (!node) return;
                var ctl = node.controller || node;
                var rid = data ? (data.rid || data.param || (data.data ? (data.data.rid || data.data.param) : null)) : null;
                if (!rid && typeof data === "number") rid = data;
                if (!rid) rid = 1;

                var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                var ro = (cfg && cfg.roleObject && rid) ? (cfg.roleObject[rid] || cfg.roleObject[String(rid)]) : null;
                var d_info = _MN[rid] || (rid ? _MN[String(rid)] : null);
                var quality = (ro && typeof ro.quality !== "undefined") ? ro.quality : (d_info ? d_info[1] : 1);
                if (quality > 8) quality = 8;
                if (quality < 1) quality = 1;

                var qCol = (typeof qualityCol !== "undefined" && qualityCol[quality]) ? qualityCol[quality] : cc.c3b(255, 255, 255);
                var qGrade = (typeof qualityIconlist !== "undefined" && qualityIconlist[quality]) ? qualityIconlist[quality] : "D";
                var ninjaName = (ro && (ro.name || ro.alt)) ? (ro.name || ro.alt) : (d_info ? d_info[0] : "Shinobi");

                // 1. Fix Chakra Name (Replace "Sample Text")
                var chakraVal = (ro && ro.chakra) ? ro.chakra : 1;
                var chakraId = 1;
                if (Array.isArray(chakraVal)) chakraId = parseInt(chakraVal[0]) || 1;
                else chakraId = parseInt(String(chakraVal).split(",")[0]) || 1;
                var chakraNames = { 1: "Fire", 2: "Wind", 3: "Lightning", 4: "Earth", 5: "Water" };
                var chakraName = chakraNames[chakraId] || "Fire";

                if (ctl.chakratxt && typeof ctl.chakratxt.setString === "function") {
                    ctl.chakratxt.setString(chakraName);
                    if (typeof ctl.chakratxt.setColor === "function") ctl.chakratxt.setColor(cc.c3b(255, 220, 100));
                }

                // 2. Fix altTF, qualityTF, zhiziTF
                if (ctl.altTF && typeof ctl.altTF.setString === "function") {
                    ctl.altTF.setString(ninjaName);
                    if (typeof ctl.altTF.setColor === "function") ctl.altTF.setColor(qCol);
                }
                if (ctl.qualityTF && typeof ctl.qualityTF.setString === "function") {
                    ctl.qualityTF.setString(qGrade);
                    if (typeof ctl.qualityTF.setColor === "function") ctl.qualityTF.setColor(qCol);
                }
                if (ctl.zhiziTF && typeof ctl.zhiziTF.setString === "function") {
                    var qVal = (typeof PropertyTools !== "undefined" && PropertyTools.roleQualifications) ? PropertyTools.roleQualifications(rid) : "19.9";
                    ctl.zhiziTF.setString(qVal);
                    if (typeof ctl.zhiziTF.setColor === "function") ctl.zhiziTF.setColor(qCol);
                }

                // 3. Fix txt0, txt1, txt2 (Replace "Sample Text" labels below stats)
                if (ctl.txt0 && typeof ctl.txt0.setString === "function") {
                    ctl.txt0.setString("Grade " + qGrade + " - " + chakraName + " Ninja");
                    if (typeof ctl.txt0.setColor === "function") ctl.txt0.setColor(cc.c3b(240, 240, 240));
                }
                if (ctl.txt1 && typeof ctl.txt1.setString === "function") {
                    ctl.txt1.setString("Special Ninjutsu Shinobi");
                    if (typeof ctl.txt1.setColor === "function") ctl.txt1.setColor(cc.c3b(190, 190, 190));
                }
                if (ctl.txt2 && typeof ctl.txt2.setString === "function") {
                    ctl.txt2.setString("");
                }

                // 4. Attach Default Special Ninjutsu Icon to skill box
                var specJ = (ro && (ro.special_jutsu || (ro.skill && ro.skill[0]))) ? (ro.special_jutsu || ro.skill[0]) : (d_info ? d_info[8] : 1149);
                if (!ctl._patchedGainSkillBox && typeof SkillBox !== "undefined") {
                    try {
                        var sb = new SkillBox(ctl);
                        sb.buildUI();
                        sb.updata(specJ);
                        sb.setPosition(108, 145);
                        node.addChild(sb, 15);
                        ctl._patchedGainSkillBox = sb;
                    } catch(eSb) {}
                }

                // 5. Ensure OK and Ignore All buttons are enabled and directly clickable
                var dismissGainDialog = function() {
                    try {
                        if (typeof AudioEngine !== "undefined" && AudioEngine.getInstance) {
                            AudioEngine.getInstance().playerEffectSound("click");
                        }
                        if (typeof PromptView !== "undefined" && PromptView.getInstance) {
                            var pv = PromptView.getInstance();
                            if (pv.dataCancelShow) pv.dataCancelShow();
                        }
                        node.removeFromParentAndCleanup(true);
                    } catch(eD1) {
                        try { node.removeFromParent(true); } catch(eD2) {}
                    }
                };

                if (ctl.okBtn) {
                    if (typeof ctl.okBtn.setEnabled === "function") ctl.okBtn.setEnabled(true);
                    if (typeof ctl.okBtn.setVisible === "function") ctl.okBtn.setVisible(true);
                }
                if (ctl.renzhehulue) {
                    if (typeof ctl.renzhehulue.setEnabled === "function") ctl.renzhehulue.setEnabled(true);
                    if (typeof ctl.renzhehulue.setVisible === "function") ctl.renzhehulue.setVisible(true);
                }

                // Register responsive touch delegate to guarantee tapping OK or Ignore All always works
                if (node.setTouchEnabled && !node._gainTouchReady) {
                    node._gainTouchReady = true;
                    node.setTouchEnabled(true);
                    node.setTouchPriority(-500); // Higher priority than background layers
                    node.onTouchesBegan = function(touches, event) {
                        return true;
                    };
                    node.onTouchesEnded = function(touches, event) {
                        if (!touches || !touches[0]) return;
                        var loc = touches[0].getLocation();
                        var hitBtn = false;
                        if (ctl.okBtn && ctl.okBtn.getParent()) {
                            var bPos = ctl.okBtn.getParent().convertToWorldSpace(ctl.okBtn.getPosition());
                            var sz = ctl.okBtn.getContentSize();
                            var rect = cc.rect(bPos.x - sz.width/2 - 10, bPos.y - sz.height/2 - 10, sz.width + 20, sz.height + 20);
                            if (cc.rectContainsPoint(rect, loc)) hitBtn = true;
                        }
                        if (ctl.renzhehulue && ctl.renzhehulue.getParent()) {
                            var bPos2 = ctl.renzhehulue.getParent().convertToWorldSpace(ctl.renzhehulue.getPosition());
                            var sz2 = ctl.renzhehulue.getContentSize();
                            var rect2 = cc.rect(bPos2.x - sz2.width/2 - 10, bPos2.y - sz2.height/2 - 10, sz2.width + 20, sz2.height + 20);
                            if (cc.rectContainsPoint(rect2, loc)) hitBtn = true;
                        }
                        if (hitBtn) {
                            dismissGainDialog();
                        }
                    };
                }
            } catch(eGNP) {}
        };

        // Hook PromptView setPageView to catch gainNinJa popup
        try {
            if (typeof PromptView !== "undefined" && PromptView.prototype && PromptView.prototype.setPageView) {
                var _origSetPageView = PromptView.prototype.setPageView;
                PromptView.prototype.setPageView = function(pageName, data) {
                    var r = _origSetPageView.apply(this, arguments);
                    try {
                        if (pageName === "gainNinJa") {
                            var selfPV = this;
                            if (typeof cc !== "undefined" && cc.Director && cc.Director.getInstance) {
                                var runningScene = cc.Director.getInstance().getRunningScene();
                                if (runningScene) {
                                    // Search running scene children for GainNinJaCCB node
                                    var children = runningScene.getChildren();
                                    if (children && children.length) {
                                        for (var ci = children.length - 1; ci >= 0; ci--) {
                                            var child = children[ci];
                                            if (child && child.controller && (child.controller.okBtn || child.controller.renzhehulue)) {
                                                _patchGainNinjaNode(child, data);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch(eSPV) {}
                    return r;
                };
            }
        } catch(ePVGuard) {}

        // Hook cc.BuilderReader.load to catch GainNinJaCCB as soon as created
        try {
            if (typeof cc !== "undefined" && cc.BuilderReader && cc.BuilderReader.load) {
                var _origCCBLoad = cc.BuilderReader.load;
                cc.BuilderReader.load = function(file, owner) {
                    var node = _origCCBLoad.apply(this, arguments);
                    try {
                        if (file && file.indexOf("GainNinJaCCB") !== -1 && node) {
                            var timerNode = node;
                            if (timerNode.scheduleOnce) {
                                timerNode.scheduleOnce(function() {
                                    _patchGainNinjaNode(timerNode, timerNode.controller ? timerNode.controller.rid : null);
                                }, 0.05);
                            }
                        }
                    } catch(eCCB) {}
                    return node;
                };
            }
        } catch(eCCBGuard) {}
    } catch (eRoleGuard) {
        if (typeof cc !== "undefined" && cc.log) cc.log("[NH Error] eRoleGuard: " + eRoleGuard);
    }
'''.replace('__JS_MN_LITERAL__', js_mn_literal).replace('__JS_SKILLS_LITERAL__', js_skills_literal)

ui_main_fixed = ui_main.replace(hook_marker, role_guard_code + '\n    ' + hook_marker)
ui_main_fixed = ui_main_fixed.replace('ws://nh.digislams.my.id:80/nadsocket', 'ws://127.0.0.1:8080/nadsocket')
ui_main_fixed = ui_main_fixed.replace('ws://nh.digislams.my.id/nadsocket', 'ws://127.0.0.1:8080/nadsocket')
ui_main_fixed = ui_main_fixed.replace('return "nh.digislams.my.id";', 'return "127.0.0.1";')


# Validate syntax with Node.js
temp_check_js = 'temp_check_main.js'
with open(temp_check_js, 'w', encoding='utf-8') as f:
    f.write(ui_main_fixed)

check_res = subprocess.run(['node', '--check', temp_check_js], capture_output=True, text=True)
if os.path.exists(temp_check_js):
    os.remove(temp_check_js)

if check_res.returncode != 0:
    print("[ERROR] JavaScript Syntax Error in patched main.js:")
    print(check_res.stderr)
    exit(1)
else:
    print("[+] JavaScript syntax check PASSED! No syntax errors.")

# 3. Preserve authentic CCBI files from source APK (do NOT overwrite with Release APK CCBIs)
clean_ccbi_map = {}

# 4. Collect authentic assets from extracted_patch (EXCLUDING any .ccbi files!)
print("[+] Collecting authentic assets from extracted_patch (skipping corrupted CCBI)...")
extra_files_to_inject = {}
if os.path.exists('extracted_patch'):
    for root, dirs, files in os.walk('extracted_patch'):
        for f in files:
            if f.endswith('.gitignore') or f.endswith('.DS_Store'):
                continue
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, 'extracted_patch').replace('\\', '/')
            # STRICT RULE: NEVER inject .ccbi from extracted_patch!
            if rel_p.endswith('.ccbi') or '/ccb/' in rel_p:
                continue
            extra_files_to_inject[f'assets/{rel_p}'] = full_p

print(f"[+] Total authentic assets from patch to inject: {len(extra_files_to_inject)}")

# 5. Build new APK with patched main.js and authentic assets
print("[+] Writing into temp_repack.apk...")
with zipfile.ZipFile(src_apk_path, 'r') as zin:
    with zipfile.ZipFile('temp_repack.apk', 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        injected_paths = set(extra_files_to_inject.keys()) | set(clean_ccbi_map.keys())

        for item in zin.infolist():
            # Skip old signatures and files we are replacing
            if item.filename.startswith('META-INF/'):
                continue
            if item.filename in injected_paths:
                continue

            if item.filename == 'assets/UI/main.js':
                zout.writestr(item, ui_main_fixed.encode('utf-8'))
            elif item.filename == 'assets/main.js':
                zout.writestr(item, ui_main_fixed.encode('utf-8'))
            else:
                zout.writestr(item, zin.read(item.filename))

        # Write clean CCBI files
        for target_path, data_bytes in clean_ccbi_map.items():
            zout.writestr(target_path, data_bytes)

        # Write all new authentic assets from extracted_patch
        for target_apk_path, local_file_path in extra_files_to_inject.items():
            with open(local_file_path, 'rb') as fp:
                zout.writestr(target_apk_path, fp.read())

print("[+] All assets and clean CCBIs written into temp_repack.apk")

# 6. Zipalign and apksigner
build_tools = r'C:\Users\Administrator\AppData\Local\Android\Sdk\build-tools\34.0.0'
apksigner = os.path.join(build_tools, 'apksigner.bat')
zipalign = os.path.join(build_tools, 'zipalign.exe')
keystore = os.path.expanduser('~/.android/debug.keystore')

if os.path.exists('aligned.apk'): os.remove('aligned.apk')
print("[+] Running zipalign...")
subprocess.run(f'"{zipalign}" -v -p 4 temp_repack.apk aligned.apk', shell=True, check=True, stdout=subprocess.DEVNULL)

print("[+] Running apksigner...")
subprocess.run(f'"{apksigner}" sign --ks "{keystore}" --ks-pass pass:android --key-pass pass:android --out OkkaNHNE-Private.apk aligned.apk', shell=True, check=True)

if os.path.exists('temp_repack.apk'): os.remove('temp_repack.apk')
if os.path.exists('aligned.apk'): os.remove('aligned.apk')

shutil.copy2('OkkaNHNE-Private.apk', 'OkkaNHNE-Private.zip')
os.makedirs('public/download', exist_ok=True)
shutil.copy2('OkkaNHNE-Private.apk', 'public/download/OkkaNHNE-Private.apk')
print("[+] OkkaNHNE-Private.apk successfully repacked, zipaligned, signed, and copied to public/download/!")
