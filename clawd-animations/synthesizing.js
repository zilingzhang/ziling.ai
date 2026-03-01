export default {
    name: 'Synthesizing',
    label: 'synthesizing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 4 input streams - particle trails from different directions
        var streamColors = [0xff4444, 0x4488ff, 0x44ff44, 0xffdd44];
        var streamDirs = [
            { dx: -1, dy: 0.3 },   // left
            { dx: 1, dy: 0.3 },    // right
            { dx: -0.5, dy: 1 },   // upper-left
            { dx: 0.5, dy: 1 }     // upper-right
        ];
        this._streams = [];
        var spGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var s = 0; s < 4; s++) {
            var particles = [];
            for (var p = 0; p < 12; p++) {
                var spMat = new THREE.MeshBasicMaterial({
                    color: streamColors[s],
                    transparent: true, opacity: 0,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                var sp = new THREE.Mesh(spGeo, spMat);
                sp.visible = false;
                scene.add(sp);
                particles.push({
                    mesh: sp,
                    life: 0, maxLife: 0,
                    x: 0, y: 0,
                    vx: 0, vy: 0,
                    delay: p * 0.08
                });
            }
            this._streams.push({
                particles: particles,
                color: streamColors[s],
                dirX: streamDirs[s].dx,
                dirY: streamDirs[s].dy,
                spawnX: ox + streamDirs[s].dx * 0.5,
                spawnY: oy + streamDirs[s].dy * 0.3,
                idx: 0,
                active: false
            });
        }

        // Mixing chamber glow (at model center)
        var mixGeo = new THREE.SphereGeometry(0.12, 10, 10);
        var mixMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._mixGlow = new THREE.Mesh(mixGeo, mixMat);
        this._mixGlow.position.set(ox, oy + 0.05, 0.01);
        scene.add(this._mixGlow);

        // Output beam (unified color, radiates upward)
        this._outputParticles = [];
        var outGeo = new THREE.SphereGeometry(0.018, 6, 6);
        for (var o = 0; o < 15; o++) {
            var oMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var out = new THREE.Mesh(outGeo, oMat);
            out.visible = false;
            scene.add(out);
            this._outputParticles.push({
                mesh: out,
                life: 0, maxLife: 0,
                vy: 0, vx: 0
            });
        }
        this._outputIdx = 0;

        // Fusion flash
        var flashGeo = new THREE.SphereGeometry(0.5, 12, 12);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._fusionFlash = new THREE.Mesh(flashGeo, flashMat);
        this._fusionFlash.position.set(ox, oy + 0.05, 0);
        scene.add(this._fusionFlash);

        // Swirl ring around mixing point
        var swirlGeo = new THREE.TorusGeometry(0.08, 0.004, 6, 24);
        var swirlMat = new THREE.MeshBasicMaterial({
            color: 0xaaaaff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._swirlRing = new THREE.Mesh(swirlGeo, swirlMat);
        this._swirlRing.position.set(ox, oy + 0.05, 0.02);
        this._swirlRing.rotation.x = Math.PI * 0.4;
        scene.add(this._swirlRing);

        this._lastStreamSpawn = 0;
        this._lastOutputSpawn = 0;
        this._outputColor = 0xffffff;
    },
    _spawnStreamParticle(stream, ox, oy) {
        var p = stream.particles[stream.idx % stream.particles.length];
        stream.idx++;
        p.mesh.visible = true;
        p.x = stream.spawnX;
        p.y = stream.spawnY;
        p.mesh.position.set(p.x, p.y, 0.02);
        // Velocity toward center
        var dx = ox - stream.spawnX;
        var dy = (oy + 0.05) - stream.spawnY;
        var len = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var spd = 0.8 + Math.random() * 0.4;
        p.vx = (dx / len) * spd;
        p.vy = (dy / len) * spd;
        p.life = 0.5 + Math.random() * 0.3;
        p.maxLife = p.life;
        p.mesh.material.opacity = 0.7;
    },
    _spawnOutputParticle(ox, oy) {
        var p = this._outputParticles[this._outputIdx % this._outputParticles.length];
        this._outputIdx++;
        p.mesh.visible = true;
        p.mesh.position.set(ox + (Math.random() - 0.5) * 0.03, oy + 0.05, 0.03);
        p.vy = 0.5 + Math.random() * 0.5;
        p.vx = (Math.random() - 0.5) * 0.15;
        p.life = 0.5 + Math.random() * 0.4;
        p.maxLife = p.life;
        p.mesh.material.opacity = 0.7;
        p.mesh.material.color.setHex(this._outputColor);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;

        if (progress < 0.10) {
            // Phase 1: Input streams activate one by one
            var t = progress / 0.10;
            for (var si = 0; si < 4; si++) {
                if (t > si * 0.2) {
                    this._streams[si].active = true;
                }
            }
            model.position.set(ox, oy, orig.z);
        } else if (progress < 0.40) {
            // Phase 2: All streams flowing toward model, mixing chamber warms
            var t2 = (progress - 0.10) / 0.30;
            this._mixGlow.material.opacity = t2 * 0.1;
            this._swirlRing.material.opacity = t2 * 0.2;
            this._swirlRing.rotation.z += delta * 2;

            model.position.set(ox, oy + Math.sin(time * 2) * 0.003, orig.z);
        } else if (progress < 0.60) {
            // Phase 3: Mixing intensifies, new combined color emerges
            var t3 = (progress - 0.40) / 0.20;
            this._mixGlow.material.opacity = 0.1 + t3 * 0.15;
            this._mixGlow.scale.setScalar(1 + Math.sin(time * 4) * 0.15);

            // Color transitions toward combined output
            var r3 = Math.floor(0xff * 0.7 + 0xaa * 0.3);
            var g3 = Math.floor(0x88 * 0.5 + 0xdd * 0.5);
            var b3 = Math.floor(0xff * 0.5 + 0x88 * 0.5);
            this._mixGlow.material.color.setRGB(r3 / 255, g3 / 255, b3 / 255);
            this._outputColor = (r3 << 16) | (g3 << 8) | b3;

            this._swirlRing.rotation.z += delta * (2 + t3 * 3);
            this._swirlRing.material.opacity = 0.2 + t3 * 0.15;
            this._swirlRing.scale.setScalar(1 + t3 * 0.3);

            model.position.set(ox, oy + Math.sin(time * 2) * 0.005, orig.z);
            model.rotation.z = Math.sin(time * 1.5) * 0.01;
        } else if (progress < 0.75) {
            // Phase 4: Output stream radiates upward, fusion happening
            var t4 = (progress - 0.60) / 0.15;
            this._mixGlow.material.opacity = 0.25 + Math.sin(time * 3) * 0.05;
            this._swirlRing.rotation.z += delta * 5;

            // Spawn output particles
            if (time - this._lastOutputSpawn > 0.08) {
                this._spawnOutputParticle(ox, oy);
                this._lastOutputSpawn = time;
            }

            model.position.set(ox, oy + 0.005, orig.z);
            model.rotation.z = Math.sin(time * 2) * 0.015;
        } else if (progress < 0.85) {
            // Phase 5: Fusion flash
            var t5 = (progress - 0.75) / 0.10;
            var flashPulse = t5 < 0.3 ? t5 / 0.3 : (1 - (t5 - 0.3) / 0.7);
            this._fusionFlash.material.opacity = flashPulse * 0.4;
            this._fusionFlash.scale.setScalar(1 + flashPulse * 2);

            this._mixGlow.material.opacity = 0.25 * (1 - t5 * 0.3);
            this._swirlRing.rotation.z += delta * 5 * (1 - t5 * 0.5);

            // Continue output
            if (time - this._lastOutputSpawn > 0.06) {
                this._spawnOutputParticle(ox, oy);
                this._lastOutputSpawn = time;
            }

            model.position.set(ox, oy + 0.005, orig.z);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.85) / 0.15;
            this._mixGlow.material.opacity = 0.18 * (1 - t6);
            this._swirlRing.material.opacity = 0.3 * (1 - t6);
            this._fusionFlash.material.opacity = 0;

            // Deactivate streams
            for (var sj = 0; sj < 4; sj++) {
                this._streams[sj].active = false;
            }

            model.position.set(ox, oy + 0.005 * (1 - t6), orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Spawn stream particles
        if (time - this._lastStreamSpawn > 0.12) {
            for (var sk = 0; sk < 4; sk++) {
                if (this._streams[sk].active) {
                    this._spawnStreamParticle(this._streams[sk], ox, oy);
                }
            }
            this._lastStreamSpawn = time;
        }

        // Update stream particles
        for (var sl = 0; sl < 4; sl++) {
            var stream = this._streams[sl];
            for (var pi = 0; pi < stream.particles.length; pi++) {
                var pp = stream.particles[pi];
                if (pp.life <= 0) continue;
                pp.life -= delta;
                if (pp.life <= 0) { pp.mesh.visible = false; continue; }
                pp.mesh.position.x += pp.vx * delta;
                pp.mesh.position.y += pp.vy * delta;
                var lr = pp.life / pp.maxLife;
                pp.mesh.material.opacity = lr * 0.6;
                pp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
            }
        }

        // Update output particles
        for (var oi = 0; oi < this._outputParticles.length; oi++) {
            var op = this._outputParticles[oi];
            if (op.life <= 0) continue;
            op.life -= delta;
            if (op.life <= 0) { op.mesh.visible = false; continue; }
            op.mesh.position.y += op.vy * delta;
            op.mesh.position.x += op.vx * delta;
            var olr = op.life / op.maxLife;
            op.mesh.material.opacity = olr * 0.6;
            op.mesh.scale.setScalar(0.5 + (1 - olr) * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._streams) {
            this._streams.forEach(function(s) {
                s.particles.forEach(function(p) {
                    scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
                });
            });
        }
        if (this._outputParticles) {
            this._outputParticles.forEach(function(o) {
                scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose();
            });
        }
        if (this._mixGlow) { scene.remove(this._mixGlow); this._mixGlow.geometry.dispose(); this._mixGlow.material.dispose(); }
        if (this._fusionFlash) { scene.remove(this._fusionFlash); this._fusionFlash.geometry.dispose(); this._fusionFlash.material.dispose(); }
        if (this._swirlRing) { scene.remove(this._swirlRing); this._swirlRing.geometry.dispose(); this._swirlRing.material.dispose(); }
        this._streams = this._outputParticles = this._mixGlow = this._fusionFlash = this._swirlRing = null;
    }
};
