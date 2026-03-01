export default {
    name: 'Harmonizing',
    label: 'harmonizing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Multiple frequency wave rings (tori at different sizes)
        this._waveRings = [];
        var ringDefs = [
            { radius: 0.06, color: 0xff4444, freq: 1.5, phase: 0 },
            { radius: 0.10, color: 0xff8844, freq: 2.1, phase: 1.2 },
            { radius: 0.14, color: 0xffcc44, freq: 1.3, phase: 2.5 },
            { radius: 0.18, color: 0x44ff44, freq: 2.8, phase: 0.7 },
            { radius: 0.22, color: 0x4488ff, freq: 1.7, phase: 3.1 },
            { radius: 0.26, color: 0x8844ff, freq: 2.4, phase: 1.8 },
            { radius: 0.30, color: 0xff44ff, freq: 1.9, phase: 0.4 }
        ];
        for (var i = 0; i < ringDefs.length; i++) {
            var rGeo = new THREE.TorusGeometry(ringDefs[i].radius, 0.006, 8, 32);
            var rMat = new THREE.MeshBasicMaterial({
                color: ringDefs[i].color,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(rGeo, rMat);
            ring.position.set(ox - 0.05, oy, 0.01);
            scene.add(ring);
            this._waveRings.push({
                mesh: ring,
                radius: ringDefs[i].radius,
                freq: ringDefs[i].freq,
                origPhase: ringDefs[i].phase,
                currentPhase: ringDefs[i].phase,
                targetPhase: 0
            });
        }

        // Standing wave interference particles
        this._interferenceParticles = [];
        var ipGeo = new THREE.SphereGeometry(0.01, 5, 5);
        for (var pi = 0; pi < 25; pi++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var part = new THREE.Mesh(ipGeo, pMat);
            part.visible = false;
            scene.add(part);
            this._interferenceParticles.push({
                mesh: part, life: 0, maxLife: 0,
                vx: 0, vy: 0,
                angle: 0
            });
        }
        this._ipIdx = 0;

        // Resonance glow
        var glowGeo = new THREE.SphereGeometry(0.35, 14, 14);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.05, oy, -0.05);
        scene.add(this._glow);

        // Harmonic center point
        var centerGeo = new THREE.SphereGeometry(0.02, 8, 8);
        var centerMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._center = new THREE.Mesh(centerGeo, centerMat);
        this._center.position.set(ox - 0.05, oy, 0.03);
        scene.add(this._center);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Calculate harmonization factor (0 = discordant, 1 = harmonized)
        var harmony = 0;
        if (progress < 0.15) {
            harmony = 0;
        } else if (progress < 0.65) {
            harmony = (progress - 0.15) / 0.50;
        } else {
            harmony = 1.0;
        }

        if (progress < 0.10) {
            // Phase 1: Rings appear
            var t = progress / 0.10;
            for (var ri = 0; ri < this._waveRings.length; ri++) {
                var rDelay = ri * 0.1;
                var rT = Math.max(0, Math.min(1, (t - rDelay) / 0.5));
                this._waveRings[ri].mesh.material.opacity = rT * 0.5;
                this._waveRings[ri].mesh.scale.setScalar(0.5 + rT * 0.5);
            }
            this._center.material.opacity = t * 0.5;
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.65) {
            // Phase 2: Discordant pulsing, gradually synchronizing
            var t2 = (progress - 0.10) / 0.55;

            for (var ri2 = 0; ri2 < this._waveRings.length; ri2++) {
                var wr = this._waveRings[ri2];
                // Phase gradually aligns toward 0
                wr.currentPhase = wr.origPhase * (1 - harmony);
                var pulse = Math.sin(time * wr.freq + wr.currentPhase);

                // Scale pulsing (discordant = offset, harmonized = in sync)
                wr.mesh.scale.setScalar(1.0 + pulse * (0.15 - harmony * 0.08));
                wr.mesh.material.opacity = 0.4 + pulse * 0.2;

                // Rotation tilts become aligned
                var tiltAmount = (1 - harmony) * 0.3;
                wr.mesh.rotation.x = Math.sin(time * wr.freq * 0.5 + wr.currentPhase) * tiltAmount;
                wr.mesh.rotation.y = Math.cos(time * wr.freq * 0.3 + wr.currentPhase) * tiltAmount;

                // Color shifts toward rainbow at harmony
                if (harmony > 0.5) {
                    var hue = (ri2 / this._waveRings.length + time * 0.1) % 1;
                    var r = Math.max(0, Math.min(1, Math.abs(hue * 6 - 3) - 1));
                    var g = Math.max(0, Math.min(1, 2 - Math.abs(hue * 6 - 2)));
                    var b = Math.max(0, Math.min(1, 2 - Math.abs(hue * 6 - 4)));
                    var blend = (harmony - 0.5) * 2;
                    wr.mesh.material.color.setRGB(
                        wr.mesh.material.color.r * (1 - blend * 0.3) + r * blend * 0.3,
                        wr.mesh.material.color.g * (1 - blend * 0.3) + g * blend * 0.3,
                        wr.mesh.material.color.b * (1 - blend * 0.3) + b * blend * 0.3
                    );
                }
            }

            // Interference particles at high harmony
            if (harmony > 0.4 && Math.random() < harmony * 0.08) {
                var ip = this._interferenceParticles[this._ipIdx % this._interferenceParticles.length];
                this._ipIdx++;
                ip.mesh.visible = true;
                var ipAngle = Math.random() * Math.PI * 2;
                var ipR = 0.05 + Math.random() * 0.25;
                ip.mesh.position.set(
                    ox - 0.05 + Math.cos(ipAngle) * ipR,
                    oy + Math.sin(ipAngle) * ipR,
                    0.03
                );
                ip.angle = ipAngle;
                ip.vx = Math.cos(ipAngle) * 0.2;
                ip.vy = Math.sin(ipAngle) * 0.2;
                ip.life = 0.4 + Math.random() * 0.3;
                ip.maxLife = ip.life;
                ip.mesh.material.opacity = 0.6;
            }

            this._center.material.opacity = 0.5 + harmony * 0.3;
            this._center.scale.setScalar(1 + harmony * 0.5);

            this._glow.material.opacity = harmony * 0.08;
            this._glow.scale.setScalar(1 + harmony * 0.3);

            model.position.set(ox + 0.2, oy + Math.sin(time * 1.2) * 0.005, oz);
        } else if (progress < 0.88) {
            // Phase 3: Fully harmonized - beautiful standing wave
            var t3 = (progress - 0.65) / 0.23;
            var unifiedPulse = Math.sin(time * 2);

            for (var ri3 = 0; ri3 < this._waveRings.length; ri3++) {
                var wr3 = this._waveRings[ri3];
                // All rings pulse together now
                wr3.mesh.scale.setScalar(1.0 + unifiedPulse * 0.1);
                wr3.mesh.material.opacity = 0.5 + unifiedPulse * 0.2;
                wr3.mesh.rotation.x = 0;
                wr3.mesh.rotation.y = 0;

                // Rainbow cycling
                var hue3 = (ri3 / this._waveRings.length + time * 0.15) % 1;
                var r3 = Math.max(0, Math.min(1, Math.abs(hue3 * 6 - 3) - 1));
                var g3 = Math.max(0, Math.min(1, 2 - Math.abs(hue3 * 6 - 2)));
                var b3 = Math.max(0, Math.min(1, 2 - Math.abs(hue3 * 6 - 4)));
                wr3.mesh.material.color.setRGB(r3 * 0.8 + 0.2, g3 * 0.8 + 0.2, b3 * 0.8 + 0.2);
            }

            // More interference particles
            if (Math.random() < 0.1) {
                var ip2 = this._interferenceParticles[this._ipIdx % this._interferenceParticles.length];
                this._ipIdx++;
                ip2.mesh.visible = true;
                var ipA2 = Math.random() * Math.PI * 2;
                var ipR2 = 0.1 + Math.random() * 0.2;
                ip2.mesh.position.set(
                    ox - 0.05 + Math.cos(ipA2) * ipR2,
                    oy + Math.sin(ipA2) * ipR2,
                    0.03
                );
                ip2.vx = Math.cos(ipA2) * 0.15;
                ip2.vy = Math.sin(ipA2) * 0.15;
                ip2.life = 0.5;
                ip2.maxLife = 0.5;
                ip2.mesh.material.opacity = 0.7;
            }

            this._center.material.opacity = 0.8 + unifiedPulse * 0.2;
            this._center.scale.setScalar(1.5 + unifiedPulse * 0.3);
            this._glow.material.opacity = 0.1 + unifiedPulse * 0.05;
            this._glow.scale.setScalar(1.3 + unifiedPulse * 0.2);

            model.position.set(ox + 0.2, oy + Math.sin(time * 1) * 0.003, oz);
        } else {
            // Phase 4: Fade out
            var t4 = (progress - 0.88) / 0.12;
            var fadeOut = 1 - t4;
            for (var ri4 = 0; ri4 < this._waveRings.length; ri4++) {
                this._waveRings[ri4].mesh.material.opacity *= fadeOut;
            }
            this._center.material.opacity *= fadeOut;
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox + 0.2 * fadeOut, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update interference particles
        for (var ipi = 0; ipi < this._interferenceParticles.length; ipi++) {
            var ipp = this._interferenceParticles[ipi];
            if (ipp.life <= 0) continue;
            ipp.life -= delta;
            if (ipp.life <= 0) { ipp.mesh.visible = false; continue; }
            ipp.mesh.position.x += ipp.vx * delta;
            ipp.mesh.position.y += ipp.vy * delta;
            var lr = ipp.life / ipp.maxLife;
            ipp.mesh.material.opacity = lr * 0.5;
            ipp.mesh.scale.setScalar(0.5 + (1 - lr) * 1.0);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._waveRings) {
            this._waveRings.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); });
        }
        if (this._interferenceParticles) {
            this._interferenceParticles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._center) { scene.remove(this._center); this._center.geometry.dispose(); this._center.material.dispose(); }
        this._waveRings = this._interferenceParticles = this._glow = this._center = null;
    }
};
