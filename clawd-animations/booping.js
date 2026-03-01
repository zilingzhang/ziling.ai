export default {
    name: 'Booping',
    label: 'booping',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Boop targets (cute small spheres)
        this._targets = [];
        var tGeo = new THREE.SphereGeometry(0.035, 8, 8);
        var targetPositions = [
            { x: ox + 0.4, y: oy + 0.05 },
            { x: ox + 0.35, y: oy - 0.15 },
            { x: ox + 0.5, y: oy + 0.15 },
            { x: ox + 0.3, y: oy + 0.2 }
        ];
        var targetColors = [0xffaacc, 0xccaaff, 0xaaffcc, 0xffccaa];
        for (var i = 0; i < 4; i++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: targetColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tMesh = new THREE.Mesh(tGeo, tMat);
            tMesh.position.set(targetPositions[i].x, targetPositions[i].y, 0);
            tMesh.visible = false;
            scene.add(tMesh);
            this._targets.push({
                mesh: tMesh,
                baseX: targetPositions[i].x,
                baseY: targetPositions[i].y,
                booped: false,
                squishTimer: 0,
                bounceVel: 0
            });
        }

        // Heart particles at fingertip
        this._hearts = [];
        var hGeo = new THREE.SphereGeometry(0.012, 6, 6);
        for (var h = 0; h < 20; h++) {
            var hMat = new THREE.MeshBasicMaterial({
                color: h % 2 === 0 ? 0xff88aa : 0xffaacc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var hMesh = new THREE.Mesh(hGeo, hMat);
            hMesh.visible = false;
            scene.add(hMesh);
            this._hearts.push({
                mesh: hMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._heartIdx = 0;

        // Fingertip indicator (small glowing sphere)
        var ftGeo = new THREE.SphereGeometry(0.015, 6, 6);
        var ftMat = new THREE.MeshBasicMaterial({
            color: 0xffddee, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._fingertip = new THREE.Mesh(ftGeo, ftMat);
        this._fingertip.visible = false;
        scene.add(this._fingertip);

        // Kawaii sparkle particles
        this._sparkles = [];
        var spkGeo = new THREE.OctahedronGeometry(0.01, 0);
        for (var s = 0; s < 12; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(spkGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._sparkles.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._spkIdx = 0;

        // Soft pink glow
        var glGeo = new THREE.SphereGeometry(0.25, 10, 10);
        var glMat = new THREE.MeshBasicMaterial({
            color: 0xffaacc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._kawaiiGlow = new THREE.Mesh(glGeo, glMat);
        this._kawaiiGlow.position.set(ox, oy, 0);
        scene.add(this._kawaiiGlow);

        this._currentBoop = 0;
        this._boopPhase = 0;
    },
    _burstHearts(x, y) {
        for (var i = 0; i < 5; i++) {
            var h = this._hearts[this._heartIdx % this._hearts.length];
            this._heartIdx++;
            h.mesh.visible = true;
            h.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 0.5 + Math.random() * 1.0;
            h.vx = Math.cos(angle) * spd;
            h.vy = Math.sin(angle) * spd + 0.5;
            h.vz = (Math.random() - 0.5) * 0.3;
            h.life = 0.6 + Math.random() * 0.4;
            h.maxLife = h.life;
            h.mesh.material.opacity = 0.9;
        }
    },
    _emitSparkle(x, y) {
        var s = this._sparkles[this._spkIdx % this._sparkles.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y + (Math.random() - 0.5) * 0.05, 0);
        s.vx = (Math.random() - 0.5) * 0.8;
        s.vy = 0.3 + Math.random() * 0.5;
        s.life = 0.3 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        // Calculate which boop we are on (4 boops across the animation)
        var boopDuration = 0.20;
        var boopGap = 0.03;
        var boopCycle = boopDuration + boopGap;

        if (progress < 0.05) {
            // Phase 1: Setup - targets appear
            var t = progress / 0.05;
            for (var i = 0; i < this._targets.length; i++) {
                var tgt = this._targets[i];
                tgt.mesh.visible = true;
                tgt.mesh.material.opacity = t * 0.6;
                tgt.mesh.position.set(tgt.baseX, tgt.baseY, 0);
                tgt.mesh.scale.setScalar(t);
            }
            this._fingertip.visible = true;
            this._fingertip.material.opacity = t * 0.7;
            this._kawaiiGlow.material.opacity = t * 0.05;
        } else if (progress < 0.88) {
            // Phase 2: Boop sequence
            var boopProgress = (progress - 0.05) / 0.83;
            var boopIndex = Math.min(3, Math.floor(boopProgress * 4));
            var localProgress = (boopProgress * 4 - boopIndex);

            // Model reaches toward current target
            var target = this._targets[boopIndex];

            if (localProgress < 0.4) {
                // Reaching forward
                var reach = localProgress / 0.4;
                var ease = reach * reach * (3 - 2 * reach);
                var fingerX = ox + (target.baseX - ox) * ease * 0.9;
                var fingerY = oy + (target.baseY - oy) * ease * 0.9;

                model.position.set(
                    ox + (target.baseX - ox) * ease * 0.3,
                    oy + (target.baseY - oy) * ease * 0.2,
                    oz
                );
                model.rotation.z = Math.atan2(target.baseY - oy, target.baseX - ox) * ease * 0.1;

                this._fingertip.position.set(fingerX, fingerY, 0.02);
                this._fingertip.material.opacity = 0.7 + Math.sin(time * 8) * 0.2;

                // Small heart at fingertip
                if (reach > 0.5) {
                    this._emitSparkle(fingerX, fingerY);
                }
            } else if (localProgress < 0.55) {
                // BOOP! Contact
                var boopT = (localProgress - 0.4) / 0.15;

                model.position.set(
                    ox + (target.baseX - ox) * 0.3,
                    oy + (target.baseY - oy) * 0.2,
                    oz
                );

                this._fingertip.position.set(target.baseX, target.baseY, 0.02);
                this._fingertip.scale.setScalar(1 + boopT * 0.5);

                // Target squishes
                if (!target.booped) {
                    target.booped = true;
                    this._burstHearts(target.baseX, target.baseY);
                }
                var squish = Math.sin(boopT * Math.PI);
                target.mesh.scale.set(1 + squish * 0.3, 1 - squish * 0.2, 1);

                this._kawaiiGlow.material.opacity = 0.1 + boopT * 0.1;
            } else if (localProgress < 0.75) {
                // Retract
                var retract = (localProgress - 0.55) / 0.20;
                var easeOut = 1 - (1 - retract) * (1 - retract);

                model.position.set(
                    ox + (target.baseX - ox) * 0.3 * (1 - easeOut),
                    oy + (target.baseY - oy) * 0.2 * (1 - easeOut),
                    oz
                );
                model.rotation.z = model.rotation.z * (1 - easeOut);

                this._fingertip.position.set(
                    target.baseX + (ox - target.baseX) * easeOut * 0.5,
                    target.baseY + (oy - target.baseY) * easeOut * 0.5,
                    0.02
                );
                this._fingertip.scale.setScalar(1);

                // Target bounces back
                target.mesh.scale.setScalar(1 + Math.sin(retract * Math.PI * 2) * 0.1 * (1 - retract));
                target.mesh.position.y = target.baseY + Math.sin(retract * Math.PI * 3) * 0.02 * (1 - retract);

                this._kawaiiGlow.material.opacity = 0.15 * (1 - retract * 0.5);
            } else {
                // Pause between boops
                model.position.set(ox, oy, oz);
                model.rotation.z = 0;
                target.mesh.scale.setScalar(1);
                target.mesh.position.set(target.baseX, target.baseY, 0);
                this._kawaiiGlow.material.opacity = 0.05;
            }

            // Idle animation for non-active targets
            for (var j = 0; j < this._targets.length; j++) {
                var t2 = this._targets[j];
                t2.mesh.material.opacity = 0.6;
                if (j !== boopIndex) {
                    t2.mesh.position.y = t2.baseY + Math.sin(time * 2 + j * 1.5) * 0.01;
                }
            }
        } else {
            // Phase 3: Fade out
            var t3 = (progress - 0.88) / 0.12;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var k = 0; k < this._targets.length; k++) {
                this._targets[k].mesh.material.opacity = 0.6 * (1 - t3);
                this._targets[k].mesh.scale.setScalar(1 - t3);
            }
            this._fingertip.material.opacity = 0.7 * (1 - t3);
            this._kawaiiGlow.material.opacity = 0.05 * (1 - t3);
        }

        // Update heart particles
        for (var hi = 0; hi < this._hearts.length; hi++) {
            var heart = this._hearts[hi];
            if (heart.life <= 0) continue;
            heart.life -= delta;
            if (heart.life <= 0) { heart.mesh.visible = false; continue; }
            heart.mesh.position.x += heart.vx * delta;
            heart.mesh.position.y += heart.vy * delta;
            heart.mesh.position.z += heart.vz * delta;
            heart.vy -= 0.5 * delta;
            heart.mesh.material.opacity = (heart.life / heart.maxLife) * 0.8;
            heart.mesh.scale.setScalar(0.8 + (1 - heart.life / heart.maxLife) * 0.5);
        }

        // Update sparkle particles
        for (var si = 0; si < this._sparkles.length; si++) {
            var spk = this._sparkles[si];
            if (spk.life <= 0) continue;
            spk.life -= delta;
            if (spk.life <= 0) { spk.mesh.visible = false; continue; }
            spk.mesh.position.x += spk.vx * delta;
            spk.mesh.position.y += spk.vy * delta;
            spk.mesh.rotation.z = time * 6;
            spk.mesh.material.opacity = (spk.life / spk.maxLife) * 0.7;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._targets) { this._targets.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        if (this._hearts) { this._hearts.forEach(function(h) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); }); }
        if (this._fingertip) { scene.remove(this._fingertip); this._fingertip.geometry.dispose(); this._fingertip.material.dispose(); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._kawaiiGlow) { scene.remove(this._kawaiiGlow); this._kawaiiGlow.geometry.dispose(); this._kawaiiGlow.material.dispose(); }
        this._targets = this._hearts = this._fingertip = this._sparkles = this._kawaiiGlow = null;
    }
};
