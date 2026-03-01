export default {
    name: 'Undulating',
    label: 'undulating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Ground plane grid of particles (wave surface)
        this._gridParticles = [];
        var gridGeo = new THREE.SphereGeometry(0.012, 4, 4);
        var gridCols = 16;
        var gridRows = 6;
        for (var r = 0; r < gridRows; r++) {
            for (var c = 0; c < gridCols; c++) {
                var shade = (r + c) % 3;
                var color = shade === 0 ? 0x225577 : (shade === 1 ? 0x336688 : 0x227766);
                var gMat = new THREE.MeshBasicMaterial({
                    color: color, transparent: true, opacity: 0, depthWrite: false
                });
                var gp = new THREE.Mesh(gridGeo, gMat);
                var gpX = ox - 0.8 + (c / (gridCols - 1)) * 1.6;
                var gpY = oy - 0.5 + (r / (gridRows - 1)) * 0.3;
                gp.position.set(gpX, gpY, 0);
                scene.add(gp);
                this._gridParticles.push({
                    mesh: gp,
                    baseX: gpX,
                    baseY: gpY,
                    col: c, row: r
                });
            }
        }

        // Kelp-like ribbon particles (vertical swaying lines)
        this._kelp = [];
        var kelpColors = [0x338855, 0x44aa66, 0x227744, 0x55bb77, 0x339966];
        for (var k = 0; k < 8; k++) {
            var segments = [];
            var kBaseX = ox - 0.6 + k * 0.18;
            var kBaseY = oy - 0.45;
            for (var seg = 0; seg < 5; seg++) {
                var kGeo = new THREE.BoxGeometry(0.012, 0.04, 0.005);
                var kMat = new THREE.MeshBasicMaterial({
                    color: kelpColors[k % kelpColors.length],
                    transparent: true, opacity: 0, depthWrite: false
                });
                var kMesh = new THREE.Mesh(kGeo, kMat);
                kMesh.position.set(kBaseX, kBaseY + seg * 0.04, 0);
                scene.add(kMesh);
                segments.push({ mesh: kMesh });
            }
            this._kelp.push({
                segments: segments,
                baseX: kBaseX,
                baseY: kBaseY,
                phase: Math.random() * Math.PI * 2,
                swaySpeed: 1.5 + Math.random() * 1.0,
                swayAmount: 0.02 + Math.random() * 0.02
            });
        }

        // Wave overlay rings (traveling sine visualization)
        this._waveRings = [];
        for (var wr = 0; wr < 4; wr++) {
            var wrGeo = new THREE.RingGeometry(0.15, 0.16, 16);
            var wrMat = new THREE.MeshBasicMaterial({
                color: 0x44aabb, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var wrMesh = new THREE.Mesh(wrGeo, wrMat);
            wrMesh.position.set(ox, oy - 0.3, 0);
            scene.add(wrMesh);
            this._waveRings.push({
                mesh: wrMesh,
                phase: wr * Math.PI * 0.5
            });
        }

        // Deep sea ambient glow
        var ambGeo = new THREE.SphereGeometry(0.6, 10, 10);
        var ambMat = new THREE.MeshBasicMaterial({
            color: 0x224455, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._ambientGlow = new THREE.Mesh(ambGeo, ambMat);
        this._ambientGlow.position.set(ox, oy - 0.2, -0.05);
        scene.add(this._ambientGlow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        var waveIntensity = 0;
        var waveFreq1 = 3.0;
        var waveFreq2 = 5.0;
        var waveAmp = 0;

        // Phase 1: Grid appears, gentle wave starts (0-10%)
        if (progress < 0.10) {
            var t = progress / 0.10;
            waveIntensity = t;
            waveAmp = t * 0.03;
        }
        // Phase 2: Single wave frequency (10-30%)
        else if (progress < 0.30) {
            var t2 = (progress - 0.10) / 0.20;
            waveIntensity = 0.5 + t2 * 0.3;
            waveAmp = 0.03 + t2 * 0.03;
        }
        // Phase 3: Multiple wave frequencies overlap (30-60%)
        else if (progress < 0.60) {
            var t3 = (progress - 0.30) / 0.30;
            waveIntensity = 0.8 + t3 * 0.2;
            waveAmp = 0.06 + t3 * 0.03;
        }
        // Phase 4: Full oceanic rhythm (60-82%)
        else if (progress < 0.82) {
            waveIntensity = 1.0;
            waveAmp = 0.09;
        }
        // Phase 5: Calm, fade (82-100%)
        else {
            var t5 = (progress - 0.82) / 0.18;
            waveIntensity = 1.0 - t5;
            waveAmp = 0.09 * (1 - t5);

            if (t5 > 0.8) {
                model.position.copy(this._origPos);
                model.scale.copy(this._origScale);
            }
        }

        // Update grid particles with traveling sine wave
        for (var i = 0; i < this._gridParticles.length; i++) {
            var gp = this._gridParticles[i];
            if (waveIntensity <= 0) {
                gp.mesh.material.opacity = 0;
                continue;
            }

            // Traveling wave: y offset based on x position and time
            var wave1 = Math.sin(gp.col * 0.8 - time * waveFreq1) * waveAmp;
            var wave2 = Math.sin(gp.col * 1.2 - time * waveFreq2 + 1.5) * waveAmp * 0.5;
            var wave3 = Math.sin(gp.col * 0.4 - time * 1.5 + 3.0) * waveAmp * 0.3;

            var totalWave = wave1 + wave2 + wave3;
            gp.mesh.position.y = gp.baseY + totalWave;

            // Size modulation
            var sizeWave = 0.8 + (totalWave / waveAmp) * 0.3;
            gp.mesh.scale.setScalar(Math.max(sizeWave, 0.3));

            gp.mesh.material.opacity = waveIntensity * 0.4;
        }

        // Model rides the wave
        if (progress < 0.82) {
            var modelWave1 = Math.sin(0.5 * 0.8 - time * waveFreq1) * waveAmp;
            var modelWave2 = Math.sin(0.5 * 1.2 - time * waveFreq2 + 1.5) * waveAmp * 0.5;
            var modelTotalWave = modelWave1 + modelWave2;

            model.position.set(
                ox + Math.sin(time * 0.5) * 0.01 * waveIntensity,
                oy + modelTotalWave * 2,
                0
            );
            model.rotation.z = modelTotalWave * 0.8;
        }

        // Update kelp ribbons
        for (var k = 0; k < this._kelp.length; k++) {
            var kp = this._kelp[k];
            for (var s = 0; s < kp.segments.length; s++) {
                var seg = kp.segments[s];
                var segHeight = s / kp.segments.length;
                var swayX = Math.sin(time * kp.swaySpeed + kp.phase + s * 0.5) * kp.swayAmount * (1 + segHeight);
                var waveInfluence = Math.sin(kp.baseX * 3 - time * 2) * 0.01 * waveIntensity;

                seg.mesh.position.set(
                    kp.baseX + swayX + waveInfluence,
                    kp.baseY + s * 0.04 + waveInfluence * 2,
                    0
                );
                seg.mesh.rotation.z = swayX * 3;
                seg.mesh.material.opacity = waveIntensity * 0.5;
            }
        }

        // Update wave rings
        for (var wr = 0; wr < this._waveRings.length; wr++) {
            var wrp = this._waveRings[wr];
            var ringT = (time * 0.5 + wrp.phase) % (Math.PI * 2);
            var ringX = Math.sin(ringT) * 0.4;
            var ringY = Math.sin(ringT * 2) * 0.1;
            wrp.mesh.position.set(ox + ringX, oy - 0.3 + ringY, 0);
            wrp.mesh.scale.setScalar(0.8 + Math.sin(ringT) * 0.3);
            wrp.mesh.material.opacity = waveIntensity * 0.1 * (0.5 + Math.sin(ringT) * 0.5);
        }

        // Ambient glow
        this._ambientGlow.material.opacity = waveIntensity * 0.06 * (1 + Math.sin(time * 1.5) * 0.3);
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._gridParticles) { this._gridParticles.forEach(function(g) { scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); }); }
        if (this._kelp) {
            this._kelp.forEach(function(k) {
                k.segments.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
            });
        }
        if (this._waveRings) { this._waveRings.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }); }
        if (this._ambientGlow) { scene.remove(this._ambientGlow); this._ambientGlow.geometry.dispose(); this._ambientGlow.material.dispose(); }
        this._gridParticles = this._kelp = this._waveRings = this._ambientGlow = null;
    }
};