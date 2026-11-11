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

role_guard_code = f'''    // 2e. Safeguard Config.roleObject, GameUserInfor, GameData, ArmatureTools against missing/custom ninjas
    try {{
        var _MN = {js_mn_literal};
        var _polyFillAllRoles = function(ro) {{
            if (!ro || typeof ro !== "object") return;
            var base = ro[17] || ro[9] || ro[1];
            if (!base) {{
                for (var k in ro) {{
                    if (ro.hasOwnProperty(k) && ro[k] && ro[k].xmlfile) {{
                        base = ro[k];
                        break;
                    }}
                }}
            }}
            if (!base) return;

            if (ro.__nhRolesGuarded && ro[170] && ro[199] && ro[170].name !== "Shinobi 170") return;
            ro.__nhRolesGuarded = true;

            for (var nid = 0; nid <= 1000; nid++) {{
                var d = _MN[nid] || _MN[String(nid)];
                if (!ro[nid]) {{
                    var clone = {{}};
                    for (var prop in base) {{
                        if (base.hasOwnProperty(prop)) {{
                            clone[prop] = base[prop];
                        }}
                    }}
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
                    ro[nid] = clone;
                }} else if (d) {{
                    ro[nid].name = d[0];
                    ro[nid].alt = d[0];
                    ro[nid].quality = d[1];
                    ro[nid].xmlfile = d[2];
                    ro[nid].chakra = d[3];
                }}
            }}

            ro[undefined] = ro[17] || base;
            ro["undefined"] = ro[17] || base;
            ro[null] = ro[17] || base;
            ro["null"] = ro[17] || base;
            ro[0] = ro[17] || base;
            ro["0"] = ro[17] || base;
            ro[""] = ro[17] || base;
            ro[NaN] = ro[17] || base;
            ro["NaN"] = ro[17] || base;

            if (typeof cc !== "undefined" && cc.log) {{
                cc.log("[NH Safeguard] Successfully polyfilled roleObject with authentic master ninjas (0..1000)");
            }}
        }};

        var _polyFillAllSkills = function(so) {{
            if (!so || typeof so !== "object") return;
            var baseSkill = so[1149] || so[1007] || so[1001];
            if (!baseSkill) {{
                for (var k in so) {{
                    if (so.hasOwnProperty(k) && so[k] && typeof so[k].quality !== "undefined") {{
                        baseSkill = so[k];
                        break;
                    }}
                }}
            }}
            if (!baseSkill) return;
            if (so.__nhSkillsGuarded) return;
            so.__nhSkillsGuarded = true;

            var cfg = (typeof Config !== "undefined" && Config.getInstance) ? Config.getInstance() : null;
            var sqo = cfg ? cfg.skillQualityObj : null;

            for (var sid = 1000; sid <= 3000; sid++) {{
                if (!so[sid]) {{
                    var clone = {{}};
                    for (var prop in baseSkill) {{
                        if (baseSkill.hasOwnProperty(prop)) {{
                            clone[prop] = baseSkill[prop];
                        }}
                    }}
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
                }}
                var q = so[sid].quality || 1;
                if (sqo) {{
                    if (!sqo[q]) sqo[q] = [];
                    if (sqo[q].indexOf(sid) === -1) sqo[q].push(sid);
                }}
            }}
            if (typeof cc !== "undefined" && cc.log) {{
                cc.log("[NH Safeguard] Successfully polyfilled skillObject & skillQualityObj (1000..3000)");
            }}
        }};

        if (typeof Config !== "undefined") {{
            if (Config.getInstance) {{
                var _origConfigGetInstance = Config.getInstance;
                var _inConfigCall = false;
                Config.getInstance = function () {{
                    if (_inConfigCall) {{
                        return _origConfigGetInstance.apply(this, arguments);
                    }}
                    _inConfigCall = true;
                    try {{
                        var inst = _origConfigGetInstance.apply(this, arguments);
                        if (inst && inst.roleObject) {{
                            _polyFillAllRoles(inst.roleObject);
                        }}
                        if (inst && inst.skillObject) {{
                            _polyFillAllSkills(inst.skillObject);
                        }}
                        return inst;
                    }} finally {{
                        _inConfigCall = false;
                    }}
                }};
            }}
            if (Config.prototype && Config.prototype.processRole) {{
                var _origProcessRole = Config.prototype.processRole;
                Config.prototype.processRole = function () {{
                    var res = _origProcessRole.apply(this, arguments);
                    try {{
                        if (this.roleObject) {{
                            _polyFillAllRoles(this.roleObject);
                        }}
                    }} catch(ePR) {{}}
                    return res;
                }};
            }}
            if (Config.prototype && Config.prototype.processSkill) {{
                var _origProcessSkill = Config.prototype.processSkill;
                Config.prototype.processSkill = function () {{
                    var res = _origProcessSkill.apply(this, arguments);
                    try {{
                        if (this.skillObject) {{
                            _polyFillAllSkills(this.skillObject);
                        }}
                    }} catch(ePS) {{}}
                    return res;
                }};
            }}
        }}

        // 2e2. Safeguard AdventureData and AdventureChapter against null chapter references
        try {{
            if (typeof AdventureData !== "undefined" && AdventureData.prototype) {{
                var _origGetChapter = AdventureData.prototype.getChapter;
                AdventureData.prototype.getChapter = function () {{
                    var res = _origGetChapter ? _origGetChapter.apply(this, arguments) : null;
                    var num = parseInt(res);
                    if (isNaN(num) || num < 1) num = 1;
                    if (num > 14) num = 14;
                    return num;
                }};
                var _origGetEliteChapter = AdventureData.prototype.getEliteChapter;
                AdventureData.prototype.getEliteChapter = function () {{
                    var res = _origGetEliteChapter ? _origGetEliteChapter.apply(this, arguments) : null;
                    var num = parseInt(res);
                    if (isNaN(num) || num < 1) num = 1;
                    if (num > 14) num = 14;
                    return num;
                }};
            }}
            if (typeof AdventureChapter !== "undefined" && AdventureChapter.prototype) {{
                var _origAdvChBuildUI = AdventureChapter.prototype.buildUI;
                AdventureChapter.prototype.buildUI = function () {{
                    try {{
                        for (var i = 1; i <= 14; i++) {{
                            if (!this["adven_" + i]) {{
                                this["adven_" + i] = this.adven_1 || cc.Node.create();
                            }}
                        }}
                    }} catch(eAC) {{}}
                    if (_origAdvChBuildUI) {{
                        return _origAdvChBuildUI.apply(this, arguments);
                    }}
                }};
            }}
            if (typeof GameData !== "undefined" && GameData.prototype) {{
                if (GameData.prototype.getFighters) {{
                    var _origGF = GameData.prototype.getFighters;
                    GameData.prototype.getFighters = function () {{
                        var list = _origGF ? _origGF.apply(this, arguments) : null;
                        if (!list || !Array.isArray(list) || list.length === 0) {{
                            return [
                                {{ id: 1, hp: 1000, currHp: 1000, skillList: [1149], lv: 1, exp: 0 }},
                                {{ id: 17, hp: 500, currHp: 500, skillList: [1149], lv: 1, exp: 0 }}
                            ];
                        }}
                        return list;
                    }};
                }}
                if (GameData.prototype.getCombat) {{
                    var _origGC = GameData.prototype.getCombat;
                    GameData.prototype.getCombat = function () {{
                        var c = _origGC ? _origGC.apply(this, arguments) : null;
                        if (!c || !Array.isArray(c) || c.length === 0) {{
                            return [
                                {{ idx: 0, when: 1, tid: 1, sid: 1149, bhp: -500, status: 1 }}
                            ];
                        }}
                        return c;
                    }};
                }}
            }}
        }} catch (eAdvGuard) {{}}

        // 2f. Bypass strict validation in LoginScene & RegisterBox & persist active account
        try {{
            if (typeof LoginScene !== "undefined" && LoginScene.prototype) {{
                LoginScene.prototype.validateMail = function (str) {{
                    return !!(str && String(str).trim().length >= 3);
                }};

                LoginScene.prototype.checkAccountAndPwd = function (preset) {{
                    var acc = "", pwd = "";
                    if (preset && typeof preset === "object") {{
                        acc = preset.accId || "";
                        pwd = preset.pwd || "";
                    }} else {{
                        if (this.mailTTF && typeof this.mailTTF.getText === "function") {{
                            acc = this.mailTTF.getText();
                        }}
                        if (this.pwdTTF1 && typeof this.pwdTTF1.getText === "function") {{
                            pwd = this.pwdTTF1.getText();
                        }}
                    }}
                    acc = String(acc || "").trim();
                    pwd = String(pwd || "").trim();

                    if (!acc || acc.length < 3) {{
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {{
                            PromptView.setPageView("loginTip", {{ target: this, text: "Username minimal 3 karakter." }});
                        }}
                        return;
                    }}
                    if (!pwd || pwd.length < 1) {{
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {{
                            PromptView.setPageView("loginTip", {{ target: this, text: "Silakan masukkan password." }});
                        }}
                        return;
                    }}

                    if (acc) {{
                        try {{
                            if (typeof sys !== "undefined" && sys.localStorage) {{
                                sys.localStorage.setItem("nh_active_account", acc.toLowerCase());
                            }}
                            if (typeof accountUtil !== "undefined" && accountUtil.saveAccount) {{
                                accountUtil.saveAccount(acc.toLowerCase());
                            }}
                        }} catch(eAccSave) {{}}
                    }}

                    var channel = 1;
                    if (typeof serverUtil !== "undefined" && serverUtil.getChannel) {{
                        channel = serverUtil.getChannel();
                    }}

                    return {{
                        accId: acc.toLowerCase(),
                        pwd: pwd,
                        channel: channel,
                        lv: 1
                    }};
                }};

                LoginScene.prototype.regCheck = function () {{
                    var acc = "", pwd1 = "", pwd2 = "";
                    if (this.mailTTF && typeof this.mailTTF.getText === "function") acc = this.mailTTF.getText();
                    if (this.pwdTTF1 && typeof this.pwdTTF1.getText === "function") pwd1 = this.pwdTTF1.getText();
                    if (this.pwdTTF2 && typeof this.pwdTTF2.getText === "function") pwd2 = this.pwdTTF2.getText();

                    acc = String(acc || "").trim();
                    pwd1 = String(pwd1 || "").trim();
                    pwd2 = String(pwd2 || "").trim();

                    if (!acc || acc.length < 3) {{
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {{
                            PromptView.setPageView("loginTip", {{ target: this, text: "Username minimal 3 karakter." }});
                        }}
                        return;
                    }}
                    if (!pwd1 || pwd1.length < 1) {{
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {{
                            PromptView.setPageView("loginTip", {{ target: this, text: "Silakan masukkan password." }});
                        }}
                        return;
                    }}
                    if (pwd1 !== pwd2) {{
                        if (typeof PromptView !== "undefined" && PromptView.setPageView) {{
                            PromptView.setPageView("loginTip", {{ target: this, text: "Konfirmasi password tidak cocok." }});
                        }}
                        return;
                    }}

                    if (acc) {{
                        try {{
                            if (typeof sys !== "undefined" && sys.localStorage) {{
                                sys.localStorage.setItem("nh_active_account", acc.toLowerCase());
                            }}
                            if (typeof accountUtil !== "undefined" && accountUtil.saveAccount) {{
                                accountUtil.saveAccount(acc.toLowerCase());
                            }}
                        }} catch(eAccSave) {{}}
                    }}

                    var channel = 1;
                    if (typeof serverUtil !== "undefined" && serverUtil.getChannel) {{
                        channel = serverUtil.getChannel();
                    }}

                    return {{
                        accId: acc.toLowerCase(),
                        pwd: pwd1,
                        channel: channel,
                        lv: 1
                    }};
                }};
            }}

            if (typeof RegisterBox !== "undefined" && RegisterBox.prototype) {{
                RegisterBox.prototype.checkAccountAndPwd = function () {{
                    var acc = "", pwd = "";
                    if (this.mailTTF && typeof this.mailTTF.getText === "function") acc = this.mailTTF.getText();
                    if (this.pwdTTF && typeof this.pwdTTF.getText === "function") pwd = this.pwdTTF.getText();
                    acc = String(acc || "").trim();
                    pwd = String(pwd || "").trim();
                    if (!acc || acc.length < 3) return;
                    if (!pwd || pwd.length < 1) return;

                    if (acc) {{
                        try {{
                            if (typeof sys !== "undefined" && sys.localStorage) {{
                                sys.localStorage.setItem("nh_active_account", acc.toLowerCase());
                            }}
                            if (typeof accountUtil !== "undefined" && accountUtil.saveAccount) {{
                                accountUtil.saveAccount(acc.toLowerCase());
                            }}
                        }} catch(eAccSave) {{}}
                    }}

                    var channel = 1;
                    if (typeof serverUtil !== "undefined" && serverUtil.getChannel) {{
                        channel = serverUtil.getChannel();
                    }}
                    return {{
                        accId: acc.toLowerCase(),
                        pwd: pwd,
                        channel: channel,
                        lv: 1
                    }};
                }};
            }}
        }} catch (eLoginFix) {{}}

        // 2g. Hook nad.sessionFactory to pass active account in login packet
        try {{
            if (typeof nad !== "undefined" && nad && nad.sessionFactory) {{
                var _origNadSessionFactory = nad.sessionFactory;
                nad.sessionFactory = function () {{
                    var args = Array.prototype.slice.call(arguments);
                    args[0] = "ws://nh.digislams.my.id:80/nadsocket";
                    if (typeof cc !== "undefined" && cc.log) {{
                        cc.log("[NH nad.sessionFactory] connecting to " + args[0]);
                    }}
                    var sess = _origNadSessionFactory.apply(this, args);
                    if (sess && typeof sess.send === "function" && !sess.__nhWrapped) {{
                        sess.__nhWrapped = true;
                        var _origSessSend = sess.send;
                        sess.send = function (data) {{
                            try {{
                                if (typeof data === "string" && (data.indexOf('"type":8') !== -1 || data.indexOf('"type": 8') !== -1)) {{
                                    var p = JSON.parse(data);
                                    if (p && p.type === 8 && Array.isArray(p.source)) {{
                                        var activeAcc = null;
                                        if (typeof sys !== "undefined" && sys.localStorage) {{
                                            activeAcc = sys.localStorage.getItem("nh_active_account");
                                        }}
                                        if (!activeAcc && typeof accountUtil !== "undefined" && accountUtil.getAccount) {{
                                            activeAcc = accountUtil.getAccount();
                                        }}
                                        if (activeAcc) {{
                                            p.source[0] = String(activeAcc).trim();
                                            data = JSON.stringify(p);
                                            if (typeof cc !== "undefined" && cc.log) {{
                                                cc.log("[NH Session] Injected active account into login packet: " + activeAcc);
                                            }}
                                        }}
                                    }}
                                }}
                            }} catch(eSendHook) {{}}
                            return _origSessSend.call(this, data);
                        }};
                    }}
                    return sess;
                }};
            }}
        }} catch (eNadHook) {{}}

        // 2h. Permanent VIP Display Guard: keep VIP badge and level always visible
        try {{
            if (typeof UserInfor !== "undefined" && UserInfor.prototype) {{
                var _origUpdatVip = UserInfor.prototype.updatVip;
                UserInfor.prototype.updatVip = function () {{
                    var res = _origUpdatVip ? _origUpdatVip.apply(this, arguments) : undefined;
                    try {{
                        var ud = typeof UserData !== "undefined" && UserData.getInstance ? UserData.getInstance() : null;
                        var vlv = (ud && typeof ud.vipLv !== "undefined") ? parseInt(ud.vipLv) : 0;
                        if (isNaN(vlv) || vlv < 0) vlv = 0;
                        
                        if (this.vipNode) {{
                            this.vipNode.setVisible(true);
                        }}
                        if (this.viplvImg) {{
                            this.viplvImg.setVisible(true);
                        }}
                        if (this.lvNum && typeof this.lvNum.updata === "function") {{
                            this.lvNum.updata(vlv);
                        }}
                    }} catch(eVip) {{}}
                    return res;
                }};

                var _origInitUI = UserInfor.prototype.initUI;
                UserInfor.prototype.initUI = function () {{
                    var r = _origInitUI ? _origInitUI.apply(this, arguments) : undefined;
                    try {{
                        if (this.updatVip) this.updatVip();
                    }} catch(eInitVip) {{}}
                    return r;
                }};
            }}
        }} catch(eVipGuard) {{}}
    }} catch (eRoleGuard) {{
        if (typeof cc !== "undefined" && cc.log) cc.log("[NH Error] eRoleGuard: " + eRoleGuard);
    }}
'''

ui_main_fixed = ui_main.replace(hook_marker, role_guard_code + '\n    ' + hook_marker)

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
print("[+] Repacked, aligned, and signed OkkaNHNE-Private.apk and updated zip and public/download successfully!")
