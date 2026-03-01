export default {
    name: 'Razzmatazzing',
    label: 'razzmatazzing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Double spotlights
        var spotGeo = new THREE.ConeGeometry(0.18, 0.5, 12, 1, true);
        var spotColors = [0xff44aa, 0x44aaff];
        this._spots = [];
        for (var sp = 0; sp < 2; sp++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: spotColors[sp], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var sMesh = new THREE.Mesh(spotGeo, sMat);
            sMesh.rotation.x = Math.PI;
            sMesh.position.set(ox + (sp === 0 ? -0.15 : 0.15), oy + 0.35, 0);
            scene.add(sMesh);
            this._spots.push({ mesh: sMesh });
        }

        // Firework particles
        this._fireworks = [];
        var fwGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var f = 0; f < 30; f++) {
            var fColors = [0xff4488, 0x44ff88, 0x4488ff, 0xffff44, 0xff8844, 0xaa44ff,
                           0xff44ff, 0x44ffff, 0xffaa44, 0x88ff44];
            var fMat = new THREE.MeshBasicMaterial({
                color: fColors[f % fColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var fMesh = new THREE.Mesh(fwGeo, fMat);
            fMesh.visible = false;
            scene.add(fMesh);
            this._fireworks.push({
                mesh: fMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._fwIdx = 0;
        this._lastFw = 0;

        // Confetti cannons (directional bursts)
        this._confetti = [];
        var confGeo = new THREE.PlaneGeometry(0.015, 0.015);
        var confColors = [0xff4488, 0x44ff88, 0x4488ff, 0xffff44, 0xff8844,
                          0xaa44ff, 0x44ffff, 0xff44ff, 0x88ff44, 0xffaa88,
                          0xff6644, 0x44aaff, 0xaaff44, 0xff44aa, 0x6644ff,
                          0x44ffaa, 0xffcc44, 0xcc44ff, 0xffddaa, 0x88aaff];
        for (var c = 0; c < 20; c++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: confColors[c], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var cMesh = new THREE.Mesh(confGeo, cMat);
            cMesh.visible = false;
            scene.add(cMesh);
            this._confetti.push({
                mesh: cMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0, rx: 0, ry: 0
            });
        }
        this._confIdx = 0;

        // Cymbal crash ring
        var cymGeo = new THREE.TorusGeometry(0.08, 0.015, 6, 20);
        var cymMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._cymbal = new THREE.Mesh(cymGeo, cymMat);
        this._cymbal.position.set(ox, oy, 0);
        this._cymbal.visible = false;
        scene.add(this._cymbal);

        // Roses (red spheres arcing in)
        this._roses = [];
        var roseGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var r = 0; r < 6; r++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: 0xff2244, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var rMesh = new THREE.Mesh(roseGeo, rMat);
            rMesh.visible = false;
            scene.add(rMesh);
            this._roses.push({
                mesh: rMesh,
                startX: (r < 3 ? -1 : 1) * (0.5 + Math.random() * 0.3),
                startY: -0.3 + Math.random() * 0.1,
                landX: ox + (Math.random() - 0.5) * 0.3,
                landY: oy - 0.15,
                thrown: false, throwTime: 0, landed: false
            });
        }

        // Standing ovation particles
        this._ovation = [];
        var ovGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var o = 0; o < 12; o++) {
            var oMat = new THREE.MeshBasicMaterial({
                color: 0xddcc88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var oMesh = new THREE.Mesh(ovGeo, oMat);
            oMesh.visible = false;
            scene.add(oMesh);
            this._ovation.push({
                mesh: oMesh,
                baseX: ox - 0.55 + o * 0.1,
                baseY: oy - 0.25,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Vegas neon glow
        var neonGeo = new THREE.SphereGeometry(0.4, 10, 10);
        var neonMat = new THREE.MeshBasicMaterial({
            color: 0xff44aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._neonGlow = new THREE.Mesh(neonGeo, neonMat);
        this._neonGlow.position.set(ox, oy, 0);
        scene.add(this._neonGlow);
    },
    _launchFirework(x, y) {
        for (var i = 0; i < 8; i++) {
            var fw = this._fireworks[this._fwIdx % this._fireworks.length];
            this._fwIdx++;
            fw.mesh.visible = true;
            fw.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 2.5;
            fw.vx = Math.cos(angle) * spd;
            fw.vy = Math.sin(angle) * spd;
            fw.vz = (Math.random() - 0.5) * 1.0;
            fw.life = 0.5 + Math.random() * 0.5;
            fw.maxLife = fw.life;
            fw.mesh.material.opacity = 0.9;
        }
    },
    _shootConfetti(fromX, dirX) {
        for (var i = 0; i < 6; i++) {
            var c = this._confetti[this._confIdx % this._confetti.length];
            this._confIdx++;
            c.mesh.visible = true;
            c.mesh.position.set(fromX, this._origPos.y, 0);
            c.vx = dirX * (2 + Math.random() * 2);
            c.vy = 1.5 + Math.random() * 2;
            c.vz = (Math.random() - 0.5) * 0.5;
            c.rx = (Math.random() - 0.5) * 12;
            c.ry = (Math.random() - 0.5) * 12;
            c.life = 1.0 + Math.random() * 0.8;
            c.maxLife = c.life;
            c.mesh.material.opacity = 0.9;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.06) {
            // Phase 1: Double spotlights fade in
            var t = progress / 0.06;
            for (var sp = 0; sp < 2; sp++) {
                this._spots[sp].mesh.material.opacity = t * 0.2;
            }
            this._neonGlow.material.opacity = t * 0.05;
        } else if (progress < 0.20) {
            // Phase 2: Model enters, strikes pose, fireworks begin
            var t2 = (progress - 0.06) / 0.14;

            for (var sp2 = 0; sp2 < 2; sp2++) {
                this._spots[sp2].mesh.material.opacity = 0.2 + t2 * 0.1;
            }

            model.rotation.z = Math.sin(t2 * Math.PI) * 0.15;
            model.scale.set(gs * (1 + t2 * 0.08), gs * (1 + t2 * 0.05), gs);
            model.position.set(ox, oy + Math.sin(t2 * Math.PI) * 0.03, oz);

            // Fireworks
            if (time - this._lastFw > 0.15) {
                this._launchFirework(
                    ox + (Math.random() - 0.5) * 0.6,
                    oy + 0.2 + Math.random() * 0.2
                );
                this._lastFw = time;
            }

            this._neonGlow.material.opacity = 0.05 + t2 * 0.05;
        } else if (progress < 0.40) {
            // Phase 3: Splits pose (stretch wide), confetti cannons
            var t3 = (progress - 0.20) / 0.20;

            // Splits: stretch wide
            var stretchX = Math.sin(t3 * Math.PI) * 0.15;
            model.scale.set(gs * (1.08 + stretchX * 0.5), gs * (1.05 - stretchX * 0.3), gs);
            model.position.set(ox, oy - stretchX * 0.03, oz);
            model.rotation.z = Math.sin(time * 4) * 0.05;

            // Confetti cannons from sides
            if (time - this._lastFw > 0.12) {
                this._shootConfetti(ox - 0.6, 1);
                this._shootConfetti(ox + 0.6, -1);
                this._lastFw = time;
            }

            // Fireworks continue
            if (t3 > 0.3 && time - this._lastFw > 0.08) {
                this._launchFirework(
                    ox + (Math.random() - 0.5) * 0.8,
                    oy + 0.15 + Math.random() * 0.3
                );
            }

            for (var sp3 = 0; sp3 < 2; sp3++) {
                this._spots[sp3].mesh.material.opacity = 0.3;
                this._spots[sp3].mesh.position.x = ox + (sp3 === 0 ? -0.15 : 0.15) + Math.sin(time * 2 + sp3 * Math.PI) * 0.05;
            }

            // Ovation starts
            for (var o = 0; o < this._ovation.length; o++) {
                var ov = this._ovation[o];
                ov.mesh.visible = true;
                ov.mesh.material.opacity = t3 * 0.5;
                ov.mesh.position.set(
                    ov.baseX,
                    ov.baseY + Math.abs(Math.sin(time * 6 + ov.phase)) * 0.04,
                    0
                );
            }

            this._neonGlow.material.opacity = 0.1 + Math.sin(time * 4) * 0.03;
        } else if (progress < 0.58) {
            // Phase 4: Cymbal crash, maximum showmanship
            var t4 = (progress - 0.40) / 0.18;

            model.scale.setScalar(gs * 1.1);
            model.position.set(ox + Math.sin(time * 6) * 0.02, oy + Math.abs(Math.sin(time * 8)) * 0.04, oz);
            model.rotation.z = Math.sin(time * 5) * 0.1;

            // Cymbal crash at start
            if (t4 < 0.3) {
                this._cymbal.visible = true;
                this._cymbal.material.opacity = (1 - t4 / 0.3) * 0.7;
                this._cymbal.scale.setScalar(1 + t4 * 10);
                this._cymbal.position.set(ox, oy, 0);
            } else {
                this._cymbal.visible = false;
            }

            // Fireworks galore
            if (time - this._lastFw > 0.06) {
                this._launchFirework(
                    ox + (Math.random() - 0.5) * 0.8,
                    oy + 0.1 + Math.random() * 0.3
                );
                this._lastFw = time;
            }

            // Confetti from sides
            if (Math.sin(time * 4) > 0.8) {
                this._shootConfetti(ox - 0.6, 1);
                this._shootConfetti(ox + 0.6, -1);
            }

            // Ovation bouncing high
            for (var o2 = 0; o2 < this._ovation.length; o2++) {
                var ov2 = this._ovation[o2];
                ov2.mesh.material.opacity = 0.6;
                ov2.mesh.position.y = ov2.baseY + Math.abs(Math.sin(time * 8 + ov2.phase)) * 0.06;
            }

            this._neonGlow.material.opacity = 0.13 + Math.sin(time * 5) * 0.04;
            // Cycle neon color
            var neonColorPhase = Math.floor(time * 3) % 3;
            var neonColors = [0xff44aa, 0x44aaff, 0xffaa44];
            this._neonGlow.material.color.setHex(neonColors[neonColorPhase]);

            for (var sp4 = 0; sp4 < 2; sp4++) {
                this._spots[sp4].mesh.material.opacity = 0.35;
            }
        } else if (progress < 0.75) {
            // Phase 5: Roses thrown in
            var t5 = (progress - 0.58) / 0.17;

            model.position.set(ox, oy, oz);
            model.rotation.z = Math.sin(time * 2) * 0.04;
            model.scale.setScalar(gs * 1.08);

            // Roses arc in
            for (var r = 0; r < this._roses.length; r++) {
                var rose = this._roses[r];
                var throwDelay = r * 0.12;
                if (t5 > throwDelay && !rose.thrown) {
                    rose.thrown = true;
                    rose.throwTime = t5;
                }
                if (rose.thrown) {
                    rose.mesh.visible = true;
                    var roseT = Math.min(1, (t5 - rose.throwTime) * 3);
                    var arcX = rose.startX + (rose.landX - rose.startX) * roseT;
                    var arcY = rose.startY + (rose.landY - rose.startY) * roseT + Math.sin(roseT * Math.PI) * 0.3;
                    rose.mesh.position.set(arcX, arcY, 0);
                    rose.mesh.material.opacity = 0.7;
                    rose.mesh.rotation.z = time * 5;
                    if (roseT >= 1) {
                        rose.mesh.position.set(rose.landX, rose.landY, 0);
                        rose.landed = true;
                    }
                }
            }

            // Ovation continues
            for (var o3 = 0; o3 < this._ovation.length; o3++) {
                var ov3 = this._ovation[o3];
                ov3.mesh.material.opacity = 0.6;
                ov3.mesh.position.y = ov3.baseY + Math.abs(Math.sin(time * 7 + ov3.phase)) * 0.05;
            }

            this._neonGlow.material.opacity = 0.13 - t5 * 0.03;
        } else if (progress < 0.90) {
            // Phase 6: Standing ovation, bow
            var t6 = (progress - 0.75) / 0.15;

            model.rotation.z = -t6 * 0.1;
            model.scale.setScalar(gs * (1.08 - t6 * 0.08));
            model.position.set(ox, oy, oz);

            // Roses on ground
            for (var r2 = 0; r2 < this._roses.length; r2++) {
                this._roses[r2].mesh.material.opacity = 0.7 * (1 - t6);
            }

            // Ovation fades
            for (var o4 = 0; o4 < this._ovation.length; o4++) {
                this._ovation[o4].mesh.material.opacity = 0.6 * (1 - t6);
            }

            for (var sp5 = 0; sp5 < 2; sp5++) {
                this._spots[sp5].mesh.material.opacity = 0.3 * (1 - t6);
            }

            this._neonGlow.material.opacity = 0.1 * (1 - t6);
        } else {
            // Phase 7: Lights off
            var t7 = (progress - 0.90) / 0.10;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var sp6 = 0; sp6 < 2; sp6++) {
                this._spots[sp6].mesh.material.opacity = 0;
            }
            this._neonGlow.material.opacity = 0;
        }

        // Update fireworks
        for (var fi = 0; fi < this._fireworks.length; fi++) {
            var fw = this._fireworks[fi];
            if (fw.life <= 0) continue;
            fw.life -= delta;
            if (fw.life <= 0) { fw.mesh.visible = false; continue; }
            fw.mesh.position.x += fw.vx * delta;
            fw.mesh.position.y += fw.vy * delta;
            fw.mesh.position.z += fw.vz * delta;
            fw.vy -= 2.0 * delta;
            fw.mesh.material.opacity = (fw.life / fw.maxLife) * 0.8;
            fw.mesh.scale.setScalar(0.5 + (1 - fw.life / fw.maxLife) * 1.0);
        }

        // Update confetti
        for (var ci = 0; ci < this._confetti.length; ci++) {
            var conf = this._confetti[ci];
            if (conf.life <= 0) continue;
            conf.life -= delta;
            if (conf.life <= 0) { conf.mesh.visible = false; continue; }
            conf.mesh.position.x += conf.vx * delta;
            conf.mesh.position.y += conf.vy * delta;
            conf.mesh.position.z += conf.vz * delta;
            conf.vy -= 3.0 * delta;
            conf.vx += Math.sin(time * 4 + ci) * 0.3 * delta;
            conf.mesh.rotation.x += conf.rx * delta;
            conf.mesh.rotation.y += conf.ry * delta;
            conf.mesh.material.opacity = (conf.life / conf.maxLife) * 0.8;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._spots) { this._spots.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._fireworks) { this._fireworks.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        if (this._confetti) { this._confetti.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._cymbal) { scene.remove(this._cymbal); this._cymbal.geometry.dispose(); this._cymbal.material.dispose(); }
        if (this._roses) { this._roses.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._ovation) { this._ovation.forEach(function(o) { scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose(); }); }
        if (this._neonGlow) { scene.remove(this._neonGlow); this._neonGlow.geometry.dispose(); this._neonGlow.material.dispose(); }
        this._spots = this._fireworks = this._confetti = this._cymbal = this._roses = this._ovation = this._neonGlow = null;
    }
};
