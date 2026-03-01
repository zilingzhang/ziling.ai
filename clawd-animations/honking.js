export default {
    name: 'Honking',
    label: 'honking',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Sound wave rings (expanding tori)
        this._rings = [];
        var ringGeo = new THREE.TorusGeometry(0.08, 0.015, 8, 24);
        for (var i = 0; i < 6; i++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xffaa44 : 0xffdd66, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeo, rMat);
            ring.visible = false;
            ring.rotation.y = Math.PI * 0.5; // face forward
            scene.add(ring);
            this._rings.push({ mesh: ring, life: 0, maxLife: 0, speed: 0, startX: 0, startY: 0 });
        }
        this._ringIdx = 0;

        // Impact lines (radiate outward from honk point)
        this._impactLines = [];
        var lineGeo = new THREE.BoxGeometry(0.18, 0.006, 0.006);
        for (var j = 0; j < 12; j++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: j % 3 === 0 ? 0xffcc00 : (j % 3 === 1 ? 0xff8800 : 0xffee66),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var line = new THREE.Mesh(lineGeo, lMat);
            line.visible = false;
            scene.add(line);
            this._impactLines.push({ mesh: line, life: 0, maxLife: 0, angle: 0, startDist: 0, speed: 0 });
        }
        this._lineIdx = 0;

        // Honk flash glow
        var flashGeo = new THREE.SphereGeometry(0.15, 10, 10);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._flash = new THREE.Mesh(flashGeo, flashMat);
        this._flash.position.set(ox + 0.3, oy, 0);
        scene.add(this._flash);

        this._honkCount = 0;
        this._honkPhase = 0; // tracks within-honk progress
    },
    _emitHonk(x, y, size) {
        // Spawn ring
        var r = this._rings[this._ringIdx % this._rings.length];
        this._ringIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(x, y, 0);
        r.mesh.scale.setScalar(size);
        r.mesh.material.opacity = 0.8;
        r.life = 0.8 + size * 0.2;
        r.maxLife = r.life;
        r.speed = 2.0 + size * 1.5;
        r.startX = x;
        r.startY = y;

        // Spawn impact lines radiating forward
        var lineCount = 3 + Math.floor(size * 2);
        for (var i = 0; i < lineCount; i++) {
            var l = this._impactLines[this._lineIdx % this._impactLines.length];
            this._lineIdx++;
            l.mesh.visible = true;
            l.mesh.position.set(x, y, 0);
            // Spread in a forward cone (-60 to +60 degrees)
            l.angle = -Math.PI * 0.35 + Math.random() * Math.PI * 0.7;
            l.startDist = 0.1;
            l.speed = 2.5 + Math.random() * 2.0;
            l.mesh.rotation.z = l.angle;
            l.mesh.material.opacity = 0.7;
            l.life = 0.3 + Math.random() * 0.2;
            l.maxLife = l.life;
        }

        // Flash
        this._flash.position.set(x, y, 0);
        this._flash.material.opacity = 0.6 * size;
        this._flash.scale.setScalar(size);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Rear back
            var t = progress / 0.08;
            var easeBack = Math.sin(t * Math.PI * 0.5);
            model.position.set(ox - easeBack * 0.15, oy, oz);
            model.rotation.z = easeBack * 0.1;
            model.scale.set(gs * (1 + easeBack * 0.05), gs * (1 - easeBack * 0.03), gs);
        } else if (progress < 0.22) {
            // Phase 2: First HONK
            var t2 = (progress - 0.08) / 0.14;
            if (this._honkCount === 0) {
                this._honkCount = 1;
                this._emitHonk(ox + 0.25, oy, 1.0);
            }
            // Lunge forward then recoil
            if (t2 < 0.3) {
                var lunge = t2 / 0.3;
                model.position.set(ox + lunge * 0.2, oy, oz);
                model.rotation.z = -lunge * 0.12;
                model.scale.set(gs * (1 - lunge * 0.05), gs * (1 + lunge * 0.08), gs);
            } else {
                var recoil = (t2 - 0.3) / 0.7;
                model.position.set(ox + 0.2 - recoil * 0.25, oy, oz);
                model.rotation.z = -0.12 + recoil * 0.15;
                model.scale.set(gs * (0.95 + recoil * 0.05), gs * (1.08 - recoil * 0.08), gs);
            }
        } else if (progress < 0.38) {
            // Phase 3: Second HONK, bigger
            var t3 = (progress - 0.22) / 0.16;
            if (this._honkCount === 1) {
                this._honkCount = 2;
                this._emitHonk(ox + 0.25, oy, 1.3);
            }
            if (t3 < 0.25) {
                var lunge2 = t3 / 0.25;
                model.position.set(ox - 0.05 + lunge2 * 0.25, oy, oz);
                model.rotation.z = 0.03 - lunge2 * 0.15;
                model.scale.set(gs * (1 - lunge2 * 0.06), gs * (1 + lunge2 * 0.1), gs);
            } else {
                var recoil2 = (t3 - 0.25) / 0.75;
                model.position.set(ox + 0.2 - recoil2 * 0.28, oy + Math.sin(recoil2 * Math.PI) * 0.02, oz);
                model.rotation.z = -0.12 + recoil2 * 0.16;
                model.scale.setScalar(gs);
            }
        } else if (progress < 0.62) {
            // Phase 4: Rapid honk sequence (3 quick honks)
            var t4 = (progress - 0.38) / 0.24;
            var honkIdx = Math.floor(t4 * 3);
            var honkLocal = (t4 * 3) % 1.0;

            if (this._honkCount < 3 + honkIdx) {
                this._honkCount = 3 + honkIdx;
                this._emitHonk(ox + 0.25, oy + (honkIdx - 1) * 0.08, 0.8 + honkIdx * 0.15);
            }

            // Rapid back-and-forth
            if (honkLocal < 0.2) {
                var q = honkLocal / 0.2;
                model.position.set(ox + q * 0.18, oy + (honkIdx - 1) * 0.02, oz);
                model.rotation.z = -q * 0.1;
            } else if (honkLocal < 0.5) {
                var r2 = (honkLocal - 0.2) / 0.3;
                model.position.set(ox + 0.18 - r2 * 0.22, oy + (honkIdx - 1) * 0.02, oz);
                model.rotation.z = -0.1 + r2 * 0.12;
            } else {
                var settle = (honkLocal - 0.5) / 0.5;
                model.position.set(ox - 0.04 + settle * 0.04, oy, oz);
                model.rotation.z = 0.02 * (1 - settle);
            }
            model.scale.setScalar(gs);
        } else if (progress < 0.78) {
            // Phase 5: MEGA HONK
            var t5 = (progress - 0.62) / 0.16;
            if (this._honkCount < 6) {
                this._honkCount = 6;
                this._emitHonk(ox + 0.3, oy, 2.0);
            }

            if (t5 < 0.15) {
                // Big wind-up
                var wind = t5 / 0.15;
                model.position.set(ox - wind * 0.25, oy - wind * 0.03, oz);
                model.rotation.z = wind * 0.15;
                model.scale.set(gs * (1 + wind * 0.08), gs * (1 - wind * 0.06), gs);
            } else if (t5 < 0.35) {
                // MEGA lunge
                var mega = (t5 - 0.15) / 0.2;
                model.position.set(ox - 0.25 + mega * 0.55, oy + Math.sin(mega * Math.PI) * 0.05, oz);
                model.rotation.z = 0.15 - mega * 0.3;
                model.scale.set(gs * (1.08 - mega * 0.15), gs * (0.94 + mega * 0.15), gs);
            } else {
                // Long recoil
                var megaRecoil = (t5 - 0.35) / 0.65;
                var dampRecoil = Math.pow(1 - megaRecoil, 2);
                model.position.set(ox + 0.3 - megaRecoil * 0.35, oy, oz);
                model.rotation.z = -0.15 * dampRecoil;
                model.scale.set(gs * (0.93 + megaRecoil * 0.07), gs * (1.09 - megaRecoil * 0.09), gs);
            }
        } else if (progress < 0.92) {
            // Phase 6: Echo rings fade, model settles
            var t6 = (progress - 0.78) / 0.14;
            model.position.set(
                ox + (1 - t6) * (-0.05),
                oy,
                oz
            );
            model.rotation.z = Math.sin(t6 * Math.PI * 2) * 0.02 * (1 - t6);
            model.scale.setScalar(gs);
        } else {
            // Phase 7: Rest
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Flash decay
        if (this._flash.material.opacity > 0) {
            this._flash.material.opacity *= 0.92;
            this._flash.scale.x += delta * 3;
            this._flash.scale.y += delta * 3;
            if (this._flash.material.opacity < 0.01) this._flash.material.opacity = 0;
        }

        // Update sound wave rings
        for (var ri = 0; ri < this._rings.length; ri++) {
            var rn = this._rings[ri];
            if (rn.life <= 0) continue;
            rn.life -= delta;
            if (rn.life <= 0) { rn.mesh.visible = false; continue; }
            var lr = rn.life / rn.maxLife;
            rn.mesh.material.opacity = lr * 0.6;
            // Expand outward (to the right)
            var expansion = (1 - lr) * rn.speed;
            rn.mesh.position.x = rn.startX + expansion * 0.5;
            rn.mesh.scale.setScalar(rn.mesh.scale.x + delta * rn.speed * 0.8);
        }

        // Update impact lines
        for (var li = 0; li < this._impactLines.length; li++) {
            var ln = this._impactLines[li];
            if (ln.life <= 0) continue;
            ln.life -= delta;
            if (ln.life <= 0) { ln.mesh.visible = false; continue; }
            var llr = ln.life / ln.maxLife;
            ln.mesh.material.opacity = llr * 0.6;
            // Move outward along angle
            ln.startDist += ln.speed * delta;
            ln.mesh.position.x += Math.cos(ln.angle) * ln.speed * delta;
            ln.mesh.position.y += Math.sin(ln.angle) * ln.speed * delta;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._rings) { this._rings.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._impactLines) { this._impactLines.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        if (this._flash) { scene.remove(this._flash); this._flash.geometry.dispose(); this._flash.material.dispose(); }
        this._rings = this._impactLines = this._flash = null;
    }
};
