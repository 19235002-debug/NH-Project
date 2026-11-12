import zipfile
import subprocess
import os
import shutil
import json

print("=== Starting OkkaNHNE-Private Complete Patch & Repack ===")

# 1. Load compact master ninjas mapping
with open('master_ninjas_compact.json', 'r', encoding='utf-8') as f:
    compact_ninjas = json.load(f)

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
                    clone.hp = d ? d[4] : 2000;
                    clone.att = d ? d[5] : 200;
                    clone.def = d ? d[6] : 200;
                    clone.agi = d ? d[7] : 200;
                    clone.special_jutsu = d ? d[8] : (base.special_jutsu || 1149);
                    clone.skill = [clone.special_jutsu];
                    ro[nid] = clone;
                } else {
                    if (d) {
                        ro[nid].name = d[0];
                        ro[nid].alt = d[0];
                        ro[nid].quality = d[1];
                        ro[nid].xmlfile = d[2];
                        ro[nid].chakra = d[3];
                        ro[nid].special_jutsu = d[8];
                    }
                }
            }
        };

        try {
            if (typeof Config !== "undefined" && Config.getInstance) {
                var cfgInst = Config.getInstance();
                if (cfgInst && cfgInst.roleObject) {
                    _polyFillAllRoles(cfgInst.roleObject);
                }
                var _origInitJson = Config.prototype.initJson;
                if (_origInitJson) {
                    Config.prototype.initJson = function() {
                        var res = _origInitJson.apply(this, arguments);
                        try {
                            if (this.roleObject) {
                                _polyFillAllRoles(this.roleObject);
                            }
                        } catch(ePoly) {}
                        return res;
                    };
                }
            }
        } catch(eCfgGuard) {}

        // 2e-zbs: ZhuangBeiScene Hook (Team / Ninja screen) - Replace "Sample Text", color grade (D..UR), populate Ninjutsu
        try {
            if (typeof ZhuangBeiScene !== "undefined" && ZhuangBeiScene.prototype) {
                var _patchZBS = function(zbs) {
                    try {
                        var rd = (typeof RoleData !== "undefined" && RoleData.getInstance) ? RoleData.getInstance() : null;
                        var key = (rd && rd.currentKey) ? rd.currentKey : (zbs.currentKey || (rd ? rd.getCurrentKey() : null));
                        var hero = (rd && rd.heros && key) ? rd.heros[key] : null;
                        var rid = hero ? (hero.id || hero.rid) : (rd ? rd.getRoleID(key) : null);
                        var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
                        var ro = (cfg && cfg.roleObject && rid) ? cfg.roleObject[rid] : null;
                        var quality = (ro && typeof ro.quality !== "undefined") ? ro.quality : (hero ? hero.quality : 1);
                        if (quality > 8) quality = 8;
                        if (quality < 1) quality = 1;

                        var col = (typeof qualityCol !== "undefined" && qualityCol[quality]) ? qualityCol[quality] : cc.c3b(255, 255, 255);
                        var qGrade = (typeof qualityIconlist !== "undefined" && qualityIconlist[quality]) ? qualityIconlist[quality] : "D";
                        var ninjaName = (ro && (ro.name || ro.alt)) ? (ro.name || ro.alt) : (hero ? hero.name : "Shinobi");
                        var lv = hero ? hero.lv : (ro ? (ro.lv || 1) : 1);

                        // 1. Ninja Name: replace Sample Text with authentic name & grade color
                        if (zbs.alt) {
                            if (typeof zbs.alt.setString === "function") zbs.alt.setString(ninjaName);
                            if (typeof zbs.alt.setColor === "function") zbs.alt.setColor(col);
                        }

                        // 2. Grade text: replace SS and color with authentic grade color (D..UR)
                        if (zbs.qualityTF) {
                            if (typeof zbs.qualityTF.setString === "function") zbs.qualityTF.setString(qGrade);
                            if (typeof zbs.qualityTF.setColor === "function") zbs.qualityTF.setColor(col);
                        }

                        // 3. Qualification zhizi
                        if (zbs.zhiziTF) {
                            if (typeof PropertyTools !== "undefined" && PropertyTools.roleQualifications && rid) {
                                try { zbs.zhiziTF.setString(PropertyTools.roleQualifications(rid)); } catch(eZ) {}
                            }
                            if (typeof zbs.zhiziTF.setColor === "function") zbs.zhiziTF.setColor(col);
                        }

                        // 4. Level
                        if (zbs.lvTF && typeof zbs.lvTF.setString === "function") {
                            zbs.lvTF.setString("Lv." + lv);
                        }

                        // 5. Default Ninjutsu: ensure all 6 slots are populated
                        if (zbs.skillList && Array.isArray(zbs.skillList)) {
                            var defSkill = (ro && (ro.special_jutsu || (ro.skill && ro.skill[0]))) ? (ro.special_jutsu || ro.skill[0]) : 1149;
                            var skills = (rd && rd.getSkillListAll) ? rd.getSkillListAll(key) : null;
                            if (!skills || !Array.isArray(skills) || skills.length === 0) {
                                skills = [{ id: defSkill, sid: defSkill, type: 1, idx: 0, star: 1, sstar: 1, quality: quality }];
                            }
                            for (var s_i = 0; s_i < zbs.skillList.length; s_i++) {
                                var box = zbs.skillList[s_i];
                                if (box && skills[s_i]) {
                                    if (typeof box.updataByRoledata === "function") {
                                        try { box.updataByRoledata(skills[s_i]); } catch(eBox) {}
                                    } else if (typeof box.updata === "function") {
                                        try { box.updata(skills[s_i].id || skills[s_i].sid || defSkill, skills[s_i].quality || quality, s_i); } catch(eBox2) {}
                                    }
                                }
                            }
                        }

                        // 6. Close Button enabled
                        if (zbs.closeBtn && typeof zbs.closeBtn.setEnabled === "function") {
                            zbs.closeBtn.setEnabled(true);
                        }
                    } catch(ePatch) {}
                };

                if (ZhuangBeiScene.prototype.onChangeRoleData) {
                    var _origZBSChange = ZhuangBeiScene.prototype.onChangeRoleData;
                    ZhuangBeiScene.prototype.onChangeRoleData = function() {
                        try {
                            _origZBSChange.apply(this, arguments);
                        } catch(eZ1) {}
                        _patchZBS(this);
                    };
                }

                if (ZhuangBeiScene.prototype.refreshNija) {
                    var _origZBSRefresh = ZhuangBeiScene.prototype.refreshNija;
                    ZhuangBeiScene.prototype.refreshNija = function() {
                        try {
                            _origZBSRefresh.apply(this, arguments);
                        } catch(eZ2) {}
                        _patchZBS(this);
                    };
                }
            }
        } catch(eZBSGuard) {}

        // 2i. InforNinJaScene: Replace "Sample Text", grade font color (D..UR), fill default ninjutsu, enable closeBtn
        try {
            if (typeof InforNinJaScene !== "undefined" && InforNinJaScene.prototype) {
                var _origInforNinJaUpdata = InforNinJaScene.prototype.updata;
                InforNinJaScene.prototype.updata = function() {
                    var ret = undefined;
                    try {
                        if (_origInforNinJaUpdata) {
                            ret = _origInforNinJaUpdata.apply(this, arguments);
                        }
                    } catch(eOrig) {}

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

                        // 1. Label Nama Ninja
                        var altTargets = [ctl.alt, this.alt, (this.scene && this.scene.controller ? this.scene.controller.alt : null)];
                        for (var a_i = 0; a_i < altTargets.length; a_i++) {
                            var altObj = altTargets[a_i];
                            if (altObj && typeof altObj.setString === "function") {
                                altObj.setString(ninjaName);
                                if (typeof altObj.setColor === "function") altObj.setColor(col);
                            }
                        }

                        // 2. Label Grade Ninja
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

                        // 5. Ninjutsu Bawaan
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

                        // 6. Close button
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
    } catch (eRoleGuard) {
        if (typeof cc !== "undefined" && cc.log) cc.log("[NH Error] eRoleGuard: " + eRoleGuard);
    }
'''.replace('__JS_MN_LITERAL__', js_mn_literal)

ui_main_fixed = ui_main.replace(hook_marker, role_guard_code + '\n    ' + hook_marker)

# 3. Build new APK with all extracted assets
print("[+] Packaging APK with all authentic armatures, skill effects, and UI assets...")

# Map of extra assets to inject from local folders
extra_files_to_inject = {}

# 3a. Armatures from extracted_patch/armatures/resXML-iphonehd/
arm_src = 'extracted_patch/armatures/resXML-iphonehd'
if os.path.exists(arm_src):
    for f in os.listdir(arm_src):
        extra_files_to_inject[f'assets/armatures/resXML-iphonehd/{f}'] = os.path.join(arm_src, f)

# 3b. Export skill effects from extracted_patch/armatures/Export/
exp_src = 'extracted_patch/armatures/Export'
if os.path.exists(exp_src):
    for root, dirs, files in os.walk(exp_src):
        for f in files:
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, exp_src).replace('\\', '/')
            extra_files_to_inject[f'assets/armatures/Export/{rel_p}'] = full_p

# 3c. UI images from extracted_patch/UI/image/
ui_src = 'extracted_patch/UI/image'
if os.path.exists(ui_src):
    for root, dirs, files in os.walk(ui_src):
        for f in files:
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, ui_src).replace('\\', '/')
            extra_files_to_inject[f'assets/UI/image/{rel_p}'] = full_p

print(f"[+] Total extra authentic assets to inject: {len(extra_files_to_inject)}")

with zipfile.ZipFile('OkkaNHNE-Private.apk', 'r') as zin:
    with zipfile.ZipFile('temp_repack.apk', 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        injected_paths = set(extra_files_to_inject.keys())

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

        # Now write all new authentic assets
        for target_apk_path, local_file_path in extra_files_to_inject.items():
            with open(local_file_path, 'rb') as fp:
                zout.writestr(target_apk_path, fp.read())

print("[+] All assets written into temp_repack.apk")

# 4. Zipalign and apksigner
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

