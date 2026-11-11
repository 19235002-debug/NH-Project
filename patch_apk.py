import zipfile, subprocess, os, shutil

# 1. Read existing main.js from APK
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

            if (ro.__nhRolesGuarded && ro[193] && ro[108]) return;
            ro.__nhRolesGuarded = true;

            for (var nid = 0; nid <= 1000; nid++) {
                if (!ro[nid]) {
                    var clone = {};
                    for (var prop in base) {
                        if (base.hasOwnProperty(prop)) {
                            clone[prop] = base[prop];
                        }
                    }
                    clone.id = nid;
                    clone.alt = "Shinobi " + nid;
                    clone.name = "Shinobi " + nid;
                    clone.xmlfile = base.xmlfile || "mingren";
                    clone.quality = (base && typeof base.quality !== "undefined") ? base.quality : 1;
                    clone.chakra = [1];
                    clone.speed = 100;
                    clone.hp = 1000;
                    clone.attack = 100;
                    clone.def = 50;
                    ro[nid] = clone;
                } else if (!ro[nid].xmlfile) {
                    ro[nid].xmlfile = base.xmlfile || "mingren";
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
                cc.log("[NH Safeguard] Successfully polyfilled roleObject (0..1000) with authentic armatures");
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

        // 2f. Bypass strict validation in LoginScene & RegisterBox ("You can only use letter or number")
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

                // Add "GANTI AKUN" button to EntranceLayer and handle switchAccount
                var _origLoginTouchesEnded = LoginScene.prototype.onTouchesEnded;
                LoginScene.prototype.onTouchesEnded = function (touches) {
                    try {
                        var touch = touches && touches[0];
                        if (touch && this.btn_switchAccount && this.currentLayer === this.EntranceLayer) {
                            var p = touch.getLocation ? touch.getLocation() : cc.p(touch.x, touch.y);
                            var box = this.btn_switchAccount.getBoundingBoxToWorld ? this.btn_switchAccount.getBoundingBoxToWorld() : this.btn_switchAccount.getBoundingBox();
                            if (box && cc.rectContainsPoint(box, p)) {
                                if (typeof accountUtil !== "undefined" && accountUtil.saveAccount) {
                                    try { accountUtil.saveAccount(null); } catch (eClear) {}
                                }
                                if (typeof this.switchLayer === "function") {
                                    this.switchLayer(this.RegButtonLayer || null);
                                }
                                return;
                            }
                        }
                    } catch(eTouchSw) {}
                    if (_origLoginTouchesEnded) {
                        return _origLoginTouchesEnded.apply(this, arguments);
                    }
                };

                var _origShowEntranceLayer = LoginScene.prototype.showEntranceLayer;
                LoginScene.prototype.showEntranceLayer = function () {
                    var res = _origShowEntranceLayer ? _origShowEntranceLayer.apply(this, arguments) : undefined;
                    try {
                        if (this.EntranceLayer && !this.btn_switchAccount) {
                            var winSize = cc.Director.getInstance().getVisibleSize();
                            var origin = cc.Director.getInstance().getVisibleOrigin ? cc.Director.getInstance().getVisibleOrigin() : cc.p(0, 0);
                            var cx = origin.x + winSize.width / 2;
                            var cy = origin.y + winSize.height / 2;

                            var swLabel = cc.LabelTTF.create("GANTI AKUN / LOGOUT", "Helvetica", 22);
                            if (swLabel) {
                                swLabel.setColor(cc.c3b(255, 220, 100));
                                swLabel.setPosition(cc.p(cx, cy - 130));
                                this.EntranceLayer.addChild(swLabel, 99);
                                this.btn_switchAccount = swLabel;
                            }
                        }
                    } catch (eAddSw) {}
                    return res;
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
    } catch (eRoleGuard) {
        if (typeof cc !== "undefined" && cc.log) cc.log("[NH Error] eRoleGuard: " + eRoleGuard);
    }

'''

ui_main_fixed = ui_main.replace(hook_marker, role_guard_code + '    ' + hook_marker)

# Repack APK
with zipfile.ZipFile('OkkaNHNE-Private.apk', 'r') as zin:
    with zipfile.ZipFile('temp_repack.apk', 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename.startswith('META-INF/'):
                continue
            if item.filename == 'assets/UI/main.js':
                zout.writestr(item, ui_main_fixed.encode('utf-8'))
            elif item.filename == 'assets/main.js':
                zout.writestr(item, ui_main_fixed.encode('utf-8'))
            else:
                zout.writestr(item, zin.read(item.filename))

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
print('[+] Repacked, aligned, and signed OkkaNHNE-Private.apk and updated zip and public/download successfully!')
