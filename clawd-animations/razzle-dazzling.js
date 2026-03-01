export default {
    name: 'Razzle-Dazzling',
    label: 'razzle-dazzling',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Spotlight cone beam from above
        var spotGeo = new THREE.ConeGeometry(0.2, 0.6, 12, 1, true);
        var spotMat = new THREE.MeshBasicMaterial({
            color: 0xffffcc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._spotlight = new THREE.Mesh(spotGeo, spotMat);
        this._spotlight.position.set(ox, oy + 0.35, 0);
        this._spotlight.rotation.x = Math.PI;
        scene.add(this._spotlight);

        // Sequin particles (tiny mirrors cycling colors)
        this._sequins = [];
        var seqGeo = new THREE.PlaneGeometry(0.012, 0.012);
        for (var i = 0; i < 30; i++) {
            var seqMat = new THREE.MeshBasicMaterial({
                color: 0xffdd44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var seqMesh = new THREE.Mesh(seqGeo, seqMat);
            seqMesh.visible = false;
            scene.add(seqMesh);
            this._sequins.push({
                mesh: seqMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0,
                colorPhase: Math.random() * Math.PI * 2
            });
        }
        this._seqIdx = 0;
        this._lastSeq = 0;

        // Jazz hand spray particles (from hands)
        this._jazzParts = [];
        var jGeo = new THREE.OctahedronGeometry(0.01, 0);
        for (var j = 0; j < 20; j++) {
            var jMat = new THREE.MeshBasicMaterial({
                color: 0xffaa44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var jMesh = new THREE.Mesh(jGeo, jMat);
            jMesh.visible = false;
            scene.add(jMesh);
            this._jazzParts.push({
                mesh: jMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._jazzIdx = 0;
        this._lastJazz = 0;

        // Encore flash
        var flashGeo = new THREE.SphereGeometry(0.5, 10, 10);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffddaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._encoreFlash = new THREE.Mesh(flashGeo, flashMat);
        this._encoreFlash.position.set(ox, oy, 0);
        scene.add(this._encoreFlash);

        // Standing ovation particles (small bouncing dots)
        this._ovation = [];
        var ovGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var o = 0; o < 10; o++) {
            var oMat = new THREE.MeshBasicMaterial({
                color: 0xddcc88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var oMesh = new THREE.Mesh(ovGeo, oMat);
            oMesh.visible = false;
            scene.add(oMesh);
            this._ovation.push({
                mesh: oMesh,
                baseX: ox - 0.5 + o * 0.1,
                baseY: oy - 0.25,
                bouncePhase: Math.random() * Math.PI * 2
            });
        }

        // Broadway glow (gold/red)
        var bwGeo = new THREE.SphereGeometry(0.35, 10, 10);
        var bwMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._broadwayGlow = new THREE.Mesh(bwGeo, bwMat);
        this._broadwayGlow.position.set(ox, oy, 0);
        scene.add(this._broadwayGlow);

        this._posePhase = 0;
    },
    _emitSequins(x, y, count) {
        for (var i = 0; i < count; i++) {
            var s = this._sequins[this._seqIdx % this._sequins.length];
            this._seqIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + (Math.random() - 0.5) * 0.15, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 0.5 + Math.random() * 1.5;
            s.vx = Math.cos(angle) * spd;
            s.vy = Math.sin(angle) * spd;
            s.vz = (Math.random() - 0.5) * 0.5;
            s.life = 0.8 + Math.random() * 0.6;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.8;
        }
    },
    _sprayJazz(x, y, dir) {
        for (var i = 0; i < 4; i++) {
            var j = this._jazzParts[this._jazzIdx % this._jazzParts.length];
            this._jazzIdx++;
            j.mesh.visible = true;
            j.mesh.position.set(x, y, 0);
            var spread = (Math.random() - 0.5) * 1.5;
            j.vx = dir * (2 + Math.random() * 2);
            j.vy = 1 + spread;
            j.vz = (Math.random() - 0.5) * 0.5;
            j.life = 0.3 + Math.random() * 0.3;
            j.maxLife = j.life;
            j.mesh.material.opacity = 0.7;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Spotlight fades in, model in darkness
            var t = progress / 0.08;
            this._spotlight.material.opacity = t * 0.2;
            this._broadwayGlow.material.opacity = t * 0.05;
        } else if (progress < 0.22) {
            // Phase 2: Model strikes first pose
            var t2 = (progress - 0.08) / 0.14;
            this._spotlight.material.opacity = 0.2 + t2 * 0.1;

            // Pose: lean back, one arm out
            model.rotation.z = -t2 * 0.1;
            model.scale.set(gs * (1 + t2 * 0.05), gs * (1 + t2 * 0.03), gs);
            model.position.set(ox, oy + t2 * 0.02, oz);

            // Sequins start
            if (time - this._lastSeq > 0.1) {
                this._emitSequins(model.position.x, model.position.y, 2);
                this._lastSeq = time;
            }

            this._broadwayGlow.material.opacity = 0.05 + t2 * 0.05;
        } else if (progress < 0.45) {
            // Phase 3: Jazz hands! Sequins flying
            var t3 = (progress - 0.22) / 0.23;
            this._spotlight.material.opacity = 0.3;

            // Jazz hands motion
            var jazzWave = Math.sin(time * 8);
            model.rotation.z = jazzWave * 0.08;
            model.scale.set(gs * (1.05 + jazzWave * 0.02), gs * (1.03 - jazzWave * 0.01), gs);
            model.position.set(ox + Math.sin(time * 4) * 0.02, oy + 0.02, oz);

            // Jazz hand sprays
            if (time - this._lastJazz > 0.06) {
                var side = Math.sin(time * 8) > 0 ? 1 : -1;
                this._sprayJazz(model.position.x + side * 0.1, model.position.y + 0.05, side);
                this._lastJazz = time;
            }

            // Sequins cascade
            if (time - this._lastSeq > 0.05) {
                this._emitSequins(model.position.x, model.position.y, 3);
                this._lastSeq = time;
            }

            // Ovation starts
            for (var o = 0; o < this._ovation.length; o++) {
                var ov = this._ovation[o];
                ov.mesh.visible = true;
                ov.mesh.material.opacity = t3 * 0.5;
                ov.mesh.position.set(
                    ov.baseX,
                    ov.baseY + Math.abs(Math.sin(time * 6 + ov.bouncePhase)) * 0.03,
                    0
                );
            }

            this._broadwayGlow.material.opacity = 0.1 + Math.sin(time * 3) * 0.03;
        } else if (progress < 0.60) {
            // Phase 4: Ta-da pose
            var t4 = (progress - 0.45) / 0.15;

            // Strike dramatic pose
            var poseT = Math.min(1, t4 * 2);
            model.rotation.z = 0.12 * poseT;
            model.scale.set(gs * (1.1), gs * (1.05), gs);
            model.position.set(ox + poseT * 0.03, oy + poseT * 0.03, oz);

            // Big sequin burst
            if (t4 < 0.3) {
                this._emitSequins(model.position.x, model.position.y, 5);
            }

            // Jazz particles from both sides
            if (time - this._lastJazz > 0.05) {
                this._sprayJazz(model.position.x + 0.1, model.position.y + 0.05, 1);
                this._sprayJazz(model.position.x - 0.1, model.position.y + 0.05, -1);
                this._lastJazz = time;
            }

            this._spotlight.material.opacity = 0.35;

            // Ovation peaks
            for (var o2 = 0; o2 < this._ovation.length; o2++) {
                var ov2 = this._ovation[o2];
                ov2.mesh.material.opacity = 0.6;
                ov2.mesh.position.y = ov2.baseY + Math.abs(Math.sin(time * 8 + ov2.bouncePhase)) * 0.05;
            }

            this._broadwayGlow.material.opacity = 0.13;
        } else if (progress < 0.75) {
            // Phase 5: Encore flash
            var t5 = (progress - 0.60) / 0.15;

            if (t5 < 0.2) {
                this._encoreFlash.material.opacity = (1 - t5 / 0.2) * 0.6;
                this._encoreFlash.scale.setScalar(1 + t5 * 8);
            } else {
                this._encoreFlash.material.opacity = 0;
            }

            // Model bows
            var bowT = t5;
            model.rotation.z = 0.12 - bowT * 0.2;
            model.scale.set(gs * (1.1 - bowT * 0.05), gs * (1.05 - bowT * 0.1), gs);
            model.position.set(ox, oy + 0.03 - bowT * 0.03, oz);

            this._spotlight.material.opacity = 0.35 - t5 * 0.1;

            // More sequins
            if (time - this._lastSeq > 0.08) {
                this._emitSequins(ox, oy, 2);
                this._lastSeq = time;
            }

            // Ovation still going
            for (var o3 = 0; o3 < this._ovation.length; o3++) {
                var ov3 = this._ovation[o3];
                ov3.mesh.position.y = ov3.baseY + Math.abs(Math.sin(time * 6 + ov3.bouncePhase)) * 0.04;
            }

            this._broadwayGlow.material.opacity = 0.13 - t5 * 0.05;
        } else if (progress < 0.90) {
            // Phase 6: Standing ovation, curtain call
            var t6 = (progress - 0.75) / 0.15;

            model.position.set(ox, oy, oz);
            model.rotation.z = Math.sin(time * 2) * 0.02;
            model.scale.setScalar(gs);

            // Ovation fades
            for (var o4 = 0; o4 < this._ovation.length; o4++) {
                var ov4 = this._ovation[o4];
                ov4.mesh.material.opacity = 0.6 * (1 - t6);
                ov4.mesh.position.y = ov4.baseY + Math.abs(Math.sin(time * 5 + ov4.bouncePhase)) * 0.03 * (1 - t6);
            }

            this._spotlight.material.opacity = 0.25 * (1 - t6);
            this._broadwayGlow.material.opacity = 0.08 * (1 - t6);
        } else {
            // Phase 7: Lights out
            var t7 = (progress - 0.90) / 0.10;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._spotlight.material.opacity = 0;
            this._broadwayGlow.material.opacity = 0;
            for (var o5 = 0; o5 < this._ovation.length; o5++) {
                this._ovation[o5].mesh.visible = false;
            }
        }

        // Update sequin particles (cycle colors)
        var seqColors = [0xffdd44, 0xff4444, 0xffaa22, 0xffffff, 0xff8844, 0xffcc00];
        for (var si = 0; si < this._sequins.length; si++) {
            var seq = this._sequins[si];
            if (seq.life <= 0) continue;
            seq.life -= delta;
            if (seq.life <= 0) { seq.mesh.visible = false; continue; }
            seq.mesh.position.x += seq.vx * delta;
            seq.mesh.position.y += seq.vy * delta;
            seq.mesh.position.z += seq.vz * delta;
            seq.vy -= 1.0 * delta;
            seq.mesh.rotation.z = time * 8 + si;
            var colorIdx = Math.floor((time * 4 + seq.colorPhase) % seqColors.length);
            seq.mesh.material.color.setHex(seqColors[colorIdx]);
            seq.mesh.material.opacity = (seq.life / seq.maxLife) * 0.7;
        }

        // Update jazz particles
        for (var ji = 0; ji < this._jazzParts.length; ji++) {
            var jp = this._jazzParts[ji];
            if (jp.life <= 0) continue;
            jp.life -= delta;
            if (jp.life <= 0) { jp.mesh.visible = false; continue; }
            jp.mesh.position.x += jp.vx * delta;
            jp.mesh.position.y += jp.vy * delta;
            jp.mesh.position.z += jp.vz * delta;
            jp.vy -= 2.0 * delta;
            jp.mesh.material.opacity = (jp.life / jp.maxLife) * 0.6;
            jp.mesh.rotation.z = time * 6;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._spotlight) { scene.remove(this._spotlight); this._spotlight.geometry.dispose(); this._spotlight.material.dispose(); }
        if (this._sequins) { this._sequins.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._jazzParts) { this._jazzParts.forEach(function(j) { scene.remove(j.mesh); j.mesh.geometry.dispose(); j.mesh.material.dispose(); }); }
        if (this._encoreFlash) { scene.remove(this._encoreFlash); this._encoreFlash.geometry.dispose(); this._encoreFlash.material.dispose(); }
        if (this._ovation) { this._ovation.forEach(function(o) { scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose(); }); }
        if (this._broadwayGlow) { scene.remove(this._broadwayGlow); this._broadwayGlow.geometry.dispose(); this._broadwayGlow.material.dispose(); }
        this._spotlight = this._sequins = this._jazzParts = this._encoreFlash = this._ovation = this._broadwayGlow = null;
    }
};
