export default {
    name: 'Improvising',
    label: 'improvising',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Stimulus particles (incoming colored spheres from random directions)
        this._stimuli = [];
        var stimColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff,
                          0x44ffff, 0xff8844, 0x44ff88];
        var stimGeo = new THREE.SphereGeometry(0.02, 8, 8);
        for (var si = 0; si < 8; si++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: stimColors[si], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var stim = new THREE.Mesh(stimGeo, sMat);
            stim.visible = false;
            scene.add(stim);
            this._stimuli.push({
                mesh: stim,
                active: false,
                startTime: 0.10 + si * 0.08,
                fromAngle: (si / 8) * Math.PI * 2 + Math.random() * 0.5,
                color: stimColors[si],
                arrived: false
            });
        }

        // Response shapes (different shape per input)
        this._responses = [];
        var responseDefs = [
            { geo: new THREE.BoxGeometry(0.04, 0.04, 0.04), color: 0xff6666 },
            { geo: new THREE.OctahedronGeometry(0.03, 0), color: 0x66ff66 },
            { geo: new THREE.TorusGeometry(0.025, 0.008, 6, 12), color: 0x6666ff },
            { geo: new THREE.IcosahedronGeometry(0.03, 0), color: 0xffff66 },
            { geo: new THREE.ConeGeometry(0.025, 0.05, 6), color: 0xff66ff },
            { geo: new THREE.SphereGeometry(0.03, 6, 6), color: 0x66ffff },
            { geo: new THREE.BoxGeometry(0.05, 0.02, 0.02), color: 0xff8866 },
            { geo: new THREE.OctahedronGeometry(0.035, 0), color: 0x66ff88 }
        ];
        for (var ri = 0; ri < responseDefs.length; ri++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: responseDefs[ri].color, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var resp = new THREE.Mesh(responseDefs[ri].geo, rMat);
            resp.visible = false;
            scene.add(resp);
            this._responses.push({
                mesh: resp,
                active: false,
                rotSpeed: (Math.random() - 0.5) * 4,
                vx: 0, vy: 0
            });
        }

        // Riff trail lines (curved trails behind model)
        this._riffTrails = [];
        var trailGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.03, 4);
        for (var ti = 0; ti < 30; ti++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: stimColors[ti % stimColors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var trail = new THREE.Mesh(trailGeo, tMat);
            trail.visible = false;
            scene.add(trail);
            this._riffTrails.push({
                mesh: trail, life: 0, maxLife: 0,
                spawnTime: 0
            });
        }
        this._trailIdx = 0;
        this._lastTrail = 0;

        // Spontaneous spark bursts
        this._sparks = [];
        var sparkGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var spi = 0; spi < 20; spi++) {
            var spMat = new THREE.MeshBasicMaterial({
                color: 0xffcc44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spark = new THREE.Mesh(sparkGeo, spMat);
            spark.visible = false;
            scene.add(spark);
            this._sparks.push({
                mesh: spark, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._sparkIdx = 0;

        // Jazz energy glow
        var glowGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff8844, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy, -0.05);
        scene.add(this._glow);

        this._modelVx = 0;
        this._modelVy = 0;
    },
    _emitSpark(x, y) {
        var s = this._sparks[this._sparkIdx % this._sparks.length];
        this._sparkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.03);
        var a = Math.random() * Math.PI * 2;
        s.vx = Math.cos(a) * (0.5 + Math.random() * 0.8);
        s.vy = Math.sin(a) * (0.5 + Math.random() * 0.8);
        s.life = 0.2 + Math.random() * 0.2;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Unpredictable movement
        this._modelVx += (Math.random() - 0.5) * 2 * delta;
        this._modelVy += (Math.random() - 0.5) * 2 * delta;
        this._modelVx *= 0.95;
        this._modelVy *= 0.95;
        var mx = Math.sin(time * 3.7) * 0.05 + this._modelVx * 0.02;
        var my = Math.cos(time * 2.3) * 0.04 + this._modelVy * 0.02;

        if (progress < 0.08) {
            // Phase 1: Model starts reacting
            var t = progress / 0.08;
            model.position.set(ox + mx * t, oy + my * t, oz);
        } else if (progress < 0.75) {
            // Phase 2: Stimuli arrive, model responds
            var t2 = (progress - 0.08) / 0.67;
            model.position.set(ox + mx, oy + my, oz);
            model.rotation.z = Math.sin(time * 4) * 0.06;

            for (var si = 0; si < this._stimuli.length; si++) {
                var stim = this._stimuli[si];
                if (progress < stim.startTime) continue;

                var stimT = (progress - stim.startTime) / 0.06;
                if (stimT < 1.0) {
                    // Stimulus flying in
                    stim.mesh.visible = true;
                    var fromDist = 0.5 * (1 - stimT);
                    stim.mesh.position.set(
                        ox + Math.cos(stim.fromAngle) * fromDist,
                        oy + Math.sin(stim.fromAngle) * fromDist,
                        0.02
                    );
                    stim.mesh.material.opacity = stimT * 0.7;
                    stim.mesh.scale.setScalar(0.5 + stimT * 0.5);
                } else if (stimT < 1.3) {
                    // Impact - trigger response
                    if (!stim.arrived) {
                        stim.arrived = true;
                        // Activate response shape
                        var resp = this._responses[si];
                        resp.active = true;
                        resp.mesh.visible = true;
                        resp.mesh.position.set(model.position.x, model.position.y, 0.03);
                        var outAngle = stim.fromAngle + Math.PI + (Math.random() - 0.5) * 1.0;
                        resp.vx = Math.cos(outAngle) * 0.8;
                        resp.vy = Math.sin(outAngle) * 0.8;
                        // Sparks at impact
                        for (var sp = 0; sp < 3; sp++) {
                            this._emitSpark(model.position.x, model.position.y);
                        }
                    }
                    stim.mesh.material.opacity = (1.3 - stimT) / 0.3 * 0.7;
                } else {
                    stim.mesh.visible = false;
                }
            }

            // Update response shapes
            for (var ri = 0; ri < this._responses.length; ri++) {
                var r = this._responses[ri];
                if (!r.active) continue;
                r.mesh.position.x += r.vx * delta;
                r.mesh.position.y += r.vy * delta;
                r.vx *= 0.98;
                r.vy *= 0.98;
                r.mesh.rotation.z += delta * r.rotSpeed;
                r.mesh.material.opacity = Math.max(0, r.mesh.material.opacity - delta * 0.3);
                if (r.mesh.material.opacity < 0.02) r.mesh.visible = false;
                else r.mesh.material.opacity = Math.max(r.mesh.material.opacity, 0.3);
            }

            // Riff trails behind model
            if (time - this._lastTrail > 0.04) {
                var trail = this._riffTrails[this._trailIdx % this._riffTrails.length];
                this._trailIdx++;
                trail.mesh.visible = true;
                trail.mesh.position.set(model.position.x, model.position.y, 0.01);
                trail.mesh.rotation.z = Math.atan2(my, mx);
                trail.mesh.material.opacity = 0.4;
                trail.life = 0.6;
                trail.maxLife = 0.6;
                this._lastTrail = time;
            }

            this._glow.material.opacity = t2 * 0.08;
            this._glow.position.set(model.position.x, model.position.y, -0.05);
        } else if (progress < 0.88) {
            // Phase 3: Peak improvisation
            var t3 = (progress - 0.75) / 0.13;
            model.position.set(ox + mx * 1.3, oy + my * 1.3, oz);
            model.rotation.z = Math.sin(time * 5) * 0.08;

            // Random sparks
            if (Math.random() < 0.15) {
                this._emitSpark(model.position.x, model.position.y);
            }

            // Riff trails
            if (time - this._lastTrail > 0.03) {
                var tr2 = this._riffTrails[this._trailIdx % this._riffTrails.length];
                this._trailIdx++;
                tr2.mesh.visible = true;
                tr2.mesh.position.set(model.position.x, model.position.y, 0.01);
                tr2.mesh.rotation.z = time * 3;
                tr2.mesh.material.opacity = 0.5;
                tr2.life = 0.4;
                tr2.maxLife = 0.4;
                this._lastTrail = time;
            }

            this._glow.material.opacity = 0.08 + t3 * 0.06;
            this._glow.position.set(model.position.x, model.position.y, -0.05);
        } else {
            // Phase 4: Fade out
            var t4 = (progress - 0.88) / 0.12;
            var fadeOut = 1 - t4;
            model.position.set(ox + mx * fadeOut, oy + my * fadeOut, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var si2 = 0; si2 < this._stimuli.length; si2++) {
                this._stimuli[si2].mesh.material.opacity *= fadeOut;
            }
            for (var ri2 = 0; ri2 < this._responses.length; ri2++) {
                this._responses[ri2].mesh.material.opacity *= fadeOut;
            }
            this._glow.material.opacity *= fadeOut;
        }

        // Update riff trails
        for (var ti = 0; ti < this._riffTrails.length; ti++) {
            var tr = this._riffTrails[ti];
            if (tr.life <= 0) continue;
            tr.life -= delta;
            if (tr.life <= 0) { tr.mesh.visible = false; continue; }
            var lr = tr.life / tr.maxLife;
            tr.mesh.material.opacity = lr * 0.4;
        }

        // Update sparks
        for (var spi = 0; spi < this._sparks.length; spi++) {
            var spk = this._sparks[spi];
            if (spk.life <= 0) continue;
            spk.life -= delta;
            if (spk.life <= 0) { spk.mesh.visible = false; continue; }
            spk.mesh.position.x += spk.vx * delta;
            spk.mesh.position.y += spk.vy * delta;
            var slr = spk.life / spk.maxLife;
            spk.mesh.material.opacity = slr * 0.7;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._stimuli) {
            this._stimuli.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._responses) {
            this._responses.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); });
        }
        if (this._riffTrails) {
            this._riffTrails.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); });
        }
        if (this._sparks) {
            this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._stimuli = this._responses = this._riffTrails = this._sparks = this._glow = null;
    }
};
