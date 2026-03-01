export default {
    name: 'Vibing',
    label: 'vibing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Concentric pulse rings emanating from model
        this._pulseRings = [];
        for (var ri = 0; ri < 12; ri++) {
            var rGeo = new THREE.TorusGeometry(0.05, 0.004, 6, 28);
            var rMat = new THREE.MeshBasicMaterial({
                color: 0xffaa66, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(rGeo, rMat);
            ring.position.set(ox, oy, 0.01);
            ring.visible = false;
            scene.add(ring);
            this._pulseRings.push({
                mesh: ring, life: 0, maxLife: 0,
                startScale: 0.3
            });
        }
        this._ringIdx = 0;
        this._lastRing = 0;

        // Ambient floating particles
        this._ambientParticles = [];
        var partGeo = new THREE.SphereGeometry(0.008, 5, 5);
        var sunsetColors = [0xff8844, 0xffaa55, 0xffcc66, 0xff6644, 0xffdd88,
                           0xff9955, 0xffbb77, 0xee7733, 0xffcc99, 0xff7744,
                           0xddaa66, 0xffee88, 0xcc6633, 0xeebb77, 0xff8866];
        for (var pi = 0; pi < 30; pi++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: sunsetColors[pi % sunsetColors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var part = new THREE.Mesh(partGeo, pMat);
            // Scatter around model
            var angle = (pi / 30) * Math.PI * 2;
            var dist = 0.1 + Math.random() * 0.25;
            part.position.set(
                ox + Math.cos(angle) * dist,
                oy + Math.sin(angle) * dist * 0.7,
                0.02
            );
            part.visible = false;
            scene.add(part);
            this._ambientParticles.push({
                mesh: part,
                baseX: part.position.x,
                baseY: part.position.y,
                driftAngle: angle,
                driftSpeed: 0.1 + Math.random() * 0.15,
                bobPhase: Math.random() * Math.PI * 2,
                bobSpeed: 0.5 + Math.random() * 0.5
            });
        }

        // Warm spectrum color-shift glow (larger, behind everything)
        var glowGeo = new THREE.SphereGeometry(0.35, 14, 14);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff9955, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy, -0.05);
        scene.add(this._glow);

        // Secondary inner glow
        var innerGlowGeo = new THREE.SphereGeometry(0.15, 10, 10);
        var innerGlowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
        this._innerGlow.position.set(ox, oy, -0.03);
        scene.add(this._innerGlow);

        this._colorPhase = 0;
        this._swayAngle = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Warm spectrum color cycling
        this._colorPhase += delta * 0.3;
        var cr = 0.9 + 0.1 * Math.sin(this._colorPhase);
        var cg = 0.6 + 0.2 * Math.sin(this._colorPhase * 0.7 + 1);
        var cb = 0.3 + 0.2 * Math.sin(this._colorPhase * 0.5 + 2);
        this._glow.material.color.setRGB(cr, cg, cb);

        // Model sway (gentle)
        this._swayAngle += delta * 0.8;
        var swayX = Math.sin(this._swayAngle) * 0.015;
        var swayY = Math.cos(this._swayAngle * 0.7) * 0.008;
        var swayRot = Math.sin(this._swayAngle * 0.6) * 0.02;

        if (progress < 0.08) {
            // Phase 1: Gentle fade in
            var t = progress / 0.08;
            this._glow.material.opacity = t * 0.06;
            this._innerGlow.material.opacity = t * 0.08;

            // Ambient particles fade in
            for (var pi = 0; pi < this._ambientParticles.length; pi++) {
                var pDelay = (pi / this._ambientParticles.length) * 0.5;
                var pT = Math.max(0, Math.min(1, (t - pDelay) / 0.5));
                this._ambientParticles[pi].mesh.visible = pT > 0;
                this._ambientParticles[pi].mesh.material.opacity = pT * 0.3;
            }

            model.position.set(ox + swayX * t, oy + swayY * t, oz);
        } else if (progress < 0.85) {
            // Phase 2: Pure vibing - everything moves in harmony
            var t2 = (progress - 0.08) / 0.77;
            var vibeIntensity = Math.min(1, t2 * 2); // ramps up first half

            // Model sways
            model.position.set(ox + swayX, oy + swayY, oz);
            model.rotation.z = swayRot;

            // Pulse rings emanate at regular intervals
            var ringInterval = 0.6 - vibeIntensity * 0.2;
            if (time - this._lastRing > ringInterval) {
                var ring = this._pulseRings[this._ringIdx % this._pulseRings.length];
                this._ringIdx++;
                ring.mesh.visible = true;
                ring.mesh.position.set(ox, oy, 0.01);
                ring.mesh.scale.setScalar(0.3);
                ring.life = 1.5;
                ring.maxLife = 1.5;
                ring.mesh.material.opacity = 0.35;
                // Color from warm spectrum
                ring.mesh.material.color.setRGB(cr, cg, cb);
                this._lastRing = time;
            }

            // Ambient particles float lazily
            for (var pi2 = 0; pi2 < this._ambientParticles.length; pi2++) {
                var ap = this._ambientParticles[pi2];
                ap.mesh.visible = true;
                // Gentle circular drift
                var driftX = Math.sin(time * ap.driftSpeed + ap.driftAngle) * 0.02;
                var driftY = Math.cos(time * ap.driftSpeed * 0.8 + ap.bobPhase) * 0.015;
                ap.mesh.position.x = ap.baseX + driftX;
                ap.mesh.position.y = ap.baseY + driftY + Math.sin(time * ap.bobSpeed + ap.bobPhase) * 0.01;

                // Opacity pulses gently
                ap.mesh.material.opacity = 0.25 + Math.sin(time * ap.bobSpeed * 0.5 + ap.bobPhase) * 0.1;
                ap.mesh.scale.setScalar(0.7 + Math.sin(time * ap.bobSpeed * 0.3 + ap.bobPhase) * 0.2);

                // Color shifts through warm spectrum
                var pHue = (this._colorPhase + pi2 * 0.4) % (Math.PI * 2);
                var pr = 0.9 + 0.1 * Math.sin(pHue);
                var pg = 0.5 + 0.3 * Math.sin(pHue * 0.7 + 1);
                var pb = 0.2 + 0.2 * Math.sin(pHue * 0.5 + 2);
                ap.mesh.material.color.setRGB(pr, pg, pb);
            }

            // Glows breathe
            var breathe = Math.sin(time * 0.8);
            this._glow.material.opacity = 0.06 + vibeIntensity * 0.06 + breathe * 0.02;
            this._glow.scale.setScalar(1 + breathe * 0.1 + vibeIntensity * 0.15);
            this._innerGlow.material.opacity = 0.08 + vibeIntensity * 0.06 + breathe * 0.03;
            this._innerGlow.scale.setScalar(1 + breathe * 0.08);
        } else {
            // Phase 3: Gentle fade out
            var t3 = (progress - 0.85) / 0.15;
            var fadeOut = 1 - t3;

            model.position.set(ox + swayX * fadeOut, oy + swayY * fadeOut, oz);
            model.rotation.z = swayRot * fadeOut;

            for (var pi3 = 0; pi3 < this._ambientParticles.length; pi3++) {
                this._ambientParticles[pi3].mesh.material.opacity *= (1 - delta * 3);
            }

            this._glow.material.opacity *= fadeOut;
            this._innerGlow.material.opacity *= fadeOut;

            if (t3 > 0.9) {
                model.scale.copy(this._origScale);
            }
        }

        // Update pulse rings
        for (var uri = 0; uri < this._pulseRings.length; uri++) {
            var pr2 = this._pulseRings[uri];
            if (pr2.life <= 0) continue;
            pr2.life -= delta;
            if (pr2.life <= 0) { pr2.mesh.visible = false; continue; }
            var lrr = pr2.life / pr2.maxLife;
            pr2.mesh.material.opacity = lrr * 0.3;
            pr2.mesh.scale.setScalar(0.3 + (1 - lrr) * 2.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pulseRings) {
            this._pulseRings.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); });
        }
        if (this._ambientParticles) {
            this._ambientParticles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._innerGlow) { scene.remove(this._innerGlow); this._innerGlow.geometry.dispose(); this._innerGlow.material.dispose(); }
        this._pulseRings = this._ambientParticles = this._glow = this._innerGlow = null;
    }
};
