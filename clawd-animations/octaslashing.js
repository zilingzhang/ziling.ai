import { cloneWithMaterials, setCloneOpacity, disposeClone } from './helpers.js';

export default {
    name: 'Octaslashing',
    label: 'octaslashing',
    duration: 13,
    _buildWeapon(type, THREE) {
        var g = new THREE.Group();
        var px = 0.018; // pixel size for voxel look
        function box(w, h, d, color) {
            var geo = new THREE.BoxGeometry(w * px, h * px, d * px);
            var mat = new THREE.MeshStandardMaterial({
                color: color, transparent: true, opacity: 1,
                roughness: 0.4, metalness: 0.3
            });
            return new THREE.Mesh(geo, mat);
        }
        var handle = 0x6b4226, darkHandle = 0x4a2e14, guard = 0x555555;

        if (type === 0) {
            // Diamond Sword — long cyan blade
            var blade = box(2, 10, 1, 0x33dddd); blade.position.y = 7 * px;
            var tip = box(1, 2, 1, 0x33dddd); tip.position.y = 12.5 * px; tip.position.x = -0.5 * px;
            var gd = box(4, 1, 1, guard); gd.position.y = 1.5 * px;
            var hl = box(1, 4, 1, handle); hl.position.y = -1.5 * px;
            g.add(blade, tip, gd, hl);
        } else if (type === 1) {
            // Iron Axe — wide gray head
            var head = box(5, 4, 1, 0xcccccc); head.position.set(1.5 * px, 8 * px, 0);
            var edge = box(2, 3, 1, 0xaaaaaa); edge.position.set(4 * px, 8 * px, 0);
            var shaft = box(1, 12, 1, handle); shaft.position.y = 2 * px;
            g.add(head, edge, shaft);
        } else if (type === 2) {
            // Golden Sword — gold blade
            var gb = box(2, 10, 1, 0xffcc00); gb.position.y = 7 * px;
            var gt = box(1, 2, 1, 0xffdd33); gt.position.y = 12.5 * px; gt.position.x = -0.5 * px;
            var gg = box(4, 1, 1, 0xddaa00); gg.position.y = 1.5 * px;
            var gh = box(1, 4, 1, handle); gh.position.y = -1.5 * px;
            g.add(gb, gt, gg, gh);
        } else if (type === 3) {
            // Netherite Sword — dark blade with purple tint
            var nb = box(2, 10, 1, 0x443344); nb.position.y = 7 * px;
            var nt = box(1, 2, 1, 0x332233); nt.position.y = 12.5 * px; nt.position.x = -0.5 * px;
            var ng = box(4, 1, 1, 0x554455); ng.position.y = 1.5 * px;
            var nh = box(1, 4, 1, darkHandle); nh.position.y = -1.5 * px;
            g.add(nb, nt, ng, nh);
        } else if (type === 4) {
            // Diamond Pickaxe — T-shaped head
            var ph = box(8, 2, 1, 0x33dddd); ph.position.y = 10 * px;
            var ph2 = box(2, 2, 1, 0x2abcbc); ph2.position.set(-3.5 * px, 8.5 * px, 0);
            var ph3 = box(2, 2, 1, 0x2abcbc); ph3.position.set(3.5 * px, 8.5 * px, 0);
            var ps = box(1, 10, 1, handle); ps.position.y = 1 * px;
            g.add(ph, ph2, ph3, ps);
        } else if (type === 5) {
            // Trident — three prongs
            var prong1 = box(1, 6, 1, 0x3366cc); prong1.position.set(0, 10 * px, 0);
            var prong2 = box(1, 4, 1, 0x3366cc); prong2.position.set(-2.5 * px, 9 * px, 0);
            var prong3 = box(1, 4, 1, 0x3366cc); prong3.position.set(2.5 * px, 9 * px, 0);
            var crossbar = box(6, 1, 1, 0x4477dd); crossbar.position.y = 7 * px;
            var ts = box(1, 10, 1, handle); ts.position.y = 0;
            g.add(prong1, prong2, prong3, crossbar, ts);
        } else if (type === 6) {
            // Stone Sword — gray rough blade
            var sb = box(2, 10, 1, 0x888888); sb.position.y = 7 * px;
            var st = box(1, 2, 1, 0x777777); st.position.y = 12.5 * px; st.position.x = -0.5 * px;
            var sg = box(4, 1, 1, 0x666666); sg.position.y = 1.5 * px;
            var sh = box(1, 4, 1, handle); sh.position.y = -1.5 * px;
            g.add(sb, st, sg, sh);
        } else {
            // Wooden Axe — brown head
            var wh = box(5, 4, 1, 0x996633); wh.position.set(1.5 * px, 8 * px, 0);
            var we = box(2, 3, 1, 0x886622); we.position.set(4 * px, 8 * px, 0);
            var ws = box(1, 12, 1, darkHandle); ws.position.y = 2 * px;
            g.add(wh, we, ws);
        }
        return g;
    },
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        this._cs = this._origScale.x * 0.35;
        this._slasherCount = 8;
        this._outerR = 1.2;   // starting / pull-back radius
        this._innerR = 0.15;  // dash-in target radius

        this._group = new THREE.Group();
        scene.add(this._group);

        // 8 armed clones
        this._slashers = [];
        for (var i = 0; i < this._slasherCount; i++) {
            var clone = cloneWithMaterials(model);
            setCloneOpacity(clone, 0);
            clone.visible = false;

            var angle = (i / this._slasherCount) * Math.PI * 2;
            clone.userData.angle = angle;

            // Build and attach weapon (scale compensates for clone's small scale)
            var weapon = this._buildWeapon(i, THREE);
            weapon.scale.setScalar(8);
            // Position weapon at "hand" — offset in clone-local space
            weapon.position.set(0.6, 0.5, 0.15);
            // Point weapon toward center (rotate so blade faces inward)
            weapon.rotation.z = -angle - Math.PI * 0.5;
            clone.add(weapon);
            clone.userData.weapon = weapon;

            this._group.add(clone);
            this._slashers.push(clone);
        }

        // Impact flash rings
        this._flashes = [];
        var flashGeo = new THREE.RingGeometry(0.03, 0.12, 16);
        for (var f = 0; f < 8; f++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            var flash = new THREE.Mesh(flashGeo, fMat);
            flash.visible = false;
            scene.add(flash);
            this._flashes.push({ mesh: flash, life: 0, maxLife: 0.3 });
        }
        this._flashIdx = 0;

        // Slash line trails (thin white speed lines)
        this._slashLines = [];
        var lineGeo = new THREE.BoxGeometry(0.25, 0.006, 0.006);
        for (var sl = 0; sl < 16; sl++) {
            var slMat = new THREE.MeshBasicMaterial({
                color: sl % 2 === 0 ? 0xffffff : 0xffcccc,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var slMesh = new THREE.Mesh(lineGeo, slMat);
            slMesh.visible = false;
            scene.add(slMesh);
            this._slashLines.push({ mesh: slMesh, life: 0, maxLife: 0.25 });
        }
        this._slashLineIdx = 0;
    },
    _spawnFlash(x, y) {
        var f = this._flashes[this._flashIdx % this._flashes.length];
        this._flashIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(x, y, 0.1);
        f.life = f.maxLife;
        f.mesh.material.opacity = 1.0;
        f.mesh.scale.setScalar(0.5);
    },
    _spawnSlashLines(cx, cy, count) {
        for (var i = 0; i < count; i++) {
            var sl = this._slashLines[this._slashLineIdx % this._slashLines.length];
            this._slashLineIdx++;
            sl.mesh.visible = true;
            var a = Math.random() * Math.PI * 2;
            sl.mesh.position.set(
                cx + Math.cos(a) * 0.15 + (Math.random() - 0.5) * 0.1,
                cy + Math.sin(a) * 0.15 + (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            sl.mesh.rotation.z = a;
            sl.mesh.material.opacity = 0.7;
            sl.life = sl.maxLife;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var cs = this._cs;
        var outerR = this._outerR;
        var innerR = this._innerR;

        // Viewport center — where the camera looks
        var vcx = 0, vcy = -0.2;

        // Gentle drift for the whole formation (based on action-phase progress)
        var actionProg = Math.max(0, progress - 0.07) / 0.93;
        var driftX = Math.sin(actionProg * Math.PI * 2) * 0.4;
        var driftY = Math.sin(actionProg * Math.PI * 4) * 0.15;
        var cx = vcx + driftX;
        var cy = vcy + driftY;

        // Determine current slash radius based on phase
        var radius = outerR;
        var shakeX = 0, shakeY = 0;
        var slashPhase = -1;

        if (progress < 0.07) {
            // Phase 0: Slide to viewport center
            var t0 = progress / 0.07;
            var ease0 = t0 * t0 * (3 - 2 * t0); // smoothstep
            model.visible = true;
            model.scale.copy(this._origScale);
            model.position.set(
                orig.x + (vcx - orig.x) * ease0,
                orig.y + (vcy - orig.y) * ease0,
                -0.5
            );
            model.rotation.set(0, 0, 0);
            for (var i = 0; i < this._slashers.length; i++) {
                this._slashers[i].visible = false;
            }
        } else if (progress < 0.15) {
            // Assembly: clones appear at outer positions around viewport center
            var t = (progress - 0.07) / 0.08;
            var ease = t * t;
            model.visible = true;
            model.scale.setScalar(this._origScale.x * (1 - ease * 0.6));
            model.position.set(cx, cy, -0.5);
            model.rotation.set(0, 0, 0);

            radius = outerR;
            for (var i = 0; i < this._slashers.length; i++) {
                var c = this._slashers[i];
                var appear = Math.max(0, (t - i * 0.06) / 0.5);
                appear = Math.min(appear, 1);
                c.visible = appear > 0;
                setCloneOpacity(c, appear * 0.85);
                var a = c.userData.angle;
                c.position.set(
                    cx + Math.cos(a) * outerR * (1.5 - ease * 0.5),
                    cy + Math.sin(a) * outerR * (1.5 - ease * 0.5),
                    0
                );
                c.scale.setScalar(cs * appear);
                c.userData.weapon.visible = appear > 0.3;
            }
        } else if (progress < 0.72) {
            // Three slash cycles
            var slashProgress = (progress - 0.15) / 0.57;
            var cycle = slashProgress * 3.0;
            var cycleIdx = Math.min(Math.floor(cycle), 2);
            var cycleT = cycle - cycleIdx;
            slashPhase = cycleIdx;

            // Each cycle: dash in (0..0.35), hold impact (0.35..0.5), pull back (0.5..1.0)
            if (cycleT < 0.35) {
                var dashT = cycleT / 0.35;
                var easeIn = dashT * dashT * dashT;
                radius = outerR - (outerR - innerR) * easeIn;
            } else if (cycleT < 0.5) {
                var impactT = (cycleT - 0.35) / 0.15;
                radius = innerR;
                var shakeMag = 0.04 * (1 + cycleIdx * 0.3) * (1 - impactT);
                shakeX = Math.sin(time * 60) * shakeMag;
                shakeY = Math.cos(time * 45) * shakeMag;
                if (impactT < 0.1) {
                    this._spawnFlash(cx, cy);
                    this._spawnSlashLines(cx, cy, 3 + cycleIdx);
                }
            } else {
                var pullT = (cycleT - 0.5) / 0.5;
                var easeOut = 1 - (1 - pullT) * (1 - pullT);
                radius = innerR + (outerR - innerR) * easeOut;
            }

            // Center model — small, being slashed
            model.visible = true;
            model.scale.setScalar(this._origScale.x * 0.4);
            model.position.set(cx + shakeX, cy + shakeY, -0.5);
            if (cycleT >= 0.35 && cycleT < 0.5) {
                var flinch = (cycleT - 0.35) / 0.15;
                model.rotation.z = Math.sin(flinch * Math.PI) * 0.15 * (1 + cycleIdx * 0.2);
            } else {
                model.rotation.z = 0;
            }

            // Position slashers
            for (var j = 0; j < this._slashers.length; j++) {
                var s = this._slashers[j];
                s.visible = true;
                setCloneOpacity(s, 0.85);
                var ang = s.userData.angle;
                s.position.set(
                    cx + Math.cos(ang) * radius,
                    cy + Math.sin(ang) * radius,
                    0
                );
                s.scale.setScalar(cs);
                s.userData.weapon.rotation.z = -ang - Math.PI * 0.5;
            }
        } else if (progress < 0.85) {
            // Hold — weapons glow, center wobbles
            var holdT = (progress - 0.72) / 0.13;
            model.visible = true;
            model.scale.setScalar(this._origScale.x * 0.4);
            model.position.set(cx, cy, -0.5);
            model.rotation.z = Math.sin(time * 4) * 0.05;

            for (var k = 0; k < this._slashers.length; k++) {
                var h = this._slashers[k];
                h.visible = true;
                setCloneOpacity(h, 0.85);
                var ha = h.userData.angle;
                h.position.set(
                    cx + Math.cos(ha) * outerR,
                    cy + Math.sin(ha) * outerR,
                    0
                );
                h.scale.setScalar(cs);
                var glow = 0.3 + Math.sin(time * 6 + k) * 0.2;
                h.userData.weapon.traverse(function(child) {
                    if (child.isMesh && child.material.emissive) {
                        child.material.emissiveIntensity = glow;
                    }
                });
            }
        } else {
            // Dissolve — converge and fade, return to original position
            var disT = (progress - 0.85) / 0.15;
            var easeD = disT * disT;

            model.visible = true;
            model.position.set(
                cx * (1 - easeD) + orig.x * easeD,
                cy * (1 - easeD) + orig.y * easeD,
                -0.5
            );
            model.scale.setScalar(this._origScale.x * (0.4 + easeD * 0.6));
            model.rotation.z = 0;

            for (var m = 0; m < this._slashers.length; m++) {
                var d = this._slashers[m];
                setCloneOpacity(d, 0.85 * (1 - easeD));
                d.visible = easeD < 0.95;
                var da = d.userData.angle;
                d.position.set(
                    cx + Math.cos(da) * outerR * (1 - easeD),
                    cy + Math.sin(da) * outerR * (1 - easeD),
                    0
                );
                d.scale.setScalar(cs * (1 - easeD));
                d.userData.weapon.traverse(function(child) {
                    if (child.isMesh) child.material.opacity = 1 - easeD;
                });
            }
        }

        // Update impact flashes
        for (var fi = 0; fi < this._flashes.length; fi++) {
            var fl = this._flashes[fi];
            if (fl.life <= 0) continue;
            fl.life -= delta;
            if (fl.life <= 0) { fl.mesh.visible = false; continue; }
            var fr = fl.life / fl.maxLife;
            fl.mesh.material.opacity = fr * 0.9;
            fl.mesh.scale.setScalar(0.5 + (1 - fr) * 2.0);
        }

        // Update slash lines
        for (var li = 0; li < this._slashLines.length; li++) {
            var ln = this._slashLines[li];
            if (ln.life <= 0) continue;
            ln.life -= delta;
            if (ln.life <= 0) { ln.mesh.visible = false; continue; }
            var lr = ln.life / ln.maxLife;
            ln.mesh.material.opacity = 0.6 * lr;
            ln.mesh.scale.x = 1 + (1 - lr) * 2;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.set(0, 0, 0);
        model.visible = true;
        if (this._slashers) {
            for (var i = 0; i < this._slashers.length; i++) {
                // Dispose weapon sub-group
                var w = this._slashers[i].userData.weapon;
                if (w) {
                    w.traverse(function(child) {
                        if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); }
                    });
                }
                disposeClone(this._slashers[i]);
            }
        }
        if (this._flashes) {
            this._flashes.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); });
        }
        if (this._slashLines) {
            this._slashLines.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._group) scene.remove(this._group);
        this._slashers = this._flashes = this._slashLines = this._group = null;
    }
};
