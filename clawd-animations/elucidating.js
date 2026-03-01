export default {
    name: 'Elucidating',
    label: 'elucidating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Mystery sphere (dark, to be revealed)
        var mystGeo = new THREE.SphereGeometry(0.1, 12, 12);
        var mystMat = new THREE.MeshBasicMaterial({
            color: 0x222244, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._mystery = new THREE.Mesh(mystGeo, mystMat);
        this._mystery.position.set(ox + 0.3, oy + 0.15, 0);
        this._mystery.visible = false;
        scene.add(this._mystery);

        // Fog particles surrounding mystery
        this._fogParticles = [];
        var fogGeo = new THREE.SphereGeometry(0.04, 6, 6);
        for (var i = 0; i < 30; i++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x334466 : (i % 3 === 1 ? 0x223355 : 0x445577),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var fog = new THREE.Mesh(fogGeo, fMat);
            fog.visible = false;
            scene.add(fog);

            var fa = Math.random() * Math.PI * 2;
            var fd = 0.08 + Math.random() * 0.2;
            this._fogParticles.push({
                mesh: fog,
                baseAngle: fa,
                baseDist: fd,
                driftSpeed: 0.3 + Math.random() * 0.5,
                baseX: ox + 0.3 + Math.cos(fa) * fd,
                baseY: oy + 0.15 + Math.sin(fa) * fd * 0.7,
                retreated: false,
                scale: 0.5 + Math.random() * 1.0
            });
        }

        // Light beam (cone geometry pointing from model toward mystery)
        var beamGeo = new THREE.ConeGeometry(0.12, 0.5, 8, 1, true);
        var beamMat = new THREE.MeshBasicMaterial({
            color: 0xffffaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._beam = new THREE.Mesh(beamGeo, beamMat);
        this._beam.position.set(ox + 0.15, oy + 0.12, 0.02);
        this._beam.rotation.z = -Math.PI * 0.5;
        this._beam.visible = false;
        scene.add(this._beam);

        // Beam glow (wider soft cone)
        var beamGlowGeo = new THREE.ConeGeometry(0.2, 0.6, 8, 1, true);
        var beamGlowMat = new THREE.MeshBasicMaterial({
            color: 0xffff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._beamGlow = new THREE.Mesh(beamGlowGeo, beamGlowMat);
        this._beamGlow.position.set(ox + 0.15, oy + 0.12, 0.01);
        this._beamGlow.rotation.z = -Math.PI * 0.5;
        this._beamGlow.visible = false;
        scene.add(this._beamGlow);

        // Revealed truth sphere (bright, inside mystery)
        var truthGeo = new THREE.SphereGeometry(0.06, 12, 12);
        var truthMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._truth = new THREE.Mesh(truthGeo, truthMat);
        this._truth.position.set(ox + 0.3, oy + 0.15, 0.03);
        this._truth.visible = false;
        scene.add(this._truth);

        // Clarity particles (radiate outward from truth)
        this._clarityParticles = [];
        var cGeo = new THREE.SphereGeometry(0.012, 5, 5);
        for (var c = 0; c < 20; c++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: c % 3 === 0 ? 0xffffff : (c % 3 === 1 ? 0xaaeeff : 0xffeeaa),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cp = new THREE.Mesh(cGeo, cMat);
            cp.visible = false;
            scene.add(cp);
            this._clarityParticles.push({
                mesh: cp,
                life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._clarityIdx = 0;
        this._clarityFired = false;

        // Layer peel rings (concentric shells)
        this._peelRings = [];
        for (var r = 0; r < 4; r++) {
            var prGeo = new THREE.TorusGeometry(0.06 + r * 0.03, 0.005, 6, 24);
            var prMat = new THREE.MeshBasicMaterial({
                color: r < 2 ? 0x445577 : 0x667799,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var pr = new THREE.Mesh(prGeo, prMat);
            pr.position.set(ox + 0.3, oy + 0.15, 0.01);
            pr.visible = false;
            scene.add(pr);
            this._peelRings.push({
                mesh: pr,
                peeled: false,
                peelTime: 0.3 + r * 0.12,
                expandSpeed: 0.5 + r * 0.2
            });
        }
    },
    _fireClarity(x, y) {
        for (var i = 0; i < 20; i++) {
            var p = this._clarityParticles[i];
            p.mesh.visible = true;
            p.mesh.position.set(x, y, 0.04);
            var a = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
            var spd = 0.4 + Math.random() * 0.6;
            p.vx = Math.cos(a) * spd;
            p.vy = Math.sin(a) * spd;
            p.vz = (Math.random() - 0.5) * 0.2;
            p.life = 0.5 + Math.random() * 0.5;
            p.maxLife = p.life;
            p.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Mystery sphere appears, fog thickens
            var t = progress / 0.10;
            this._mystery.visible = true;
            this._mystery.material.opacity = t * 0.6;
            this._mystery.scale.setScalar(t);

            for (var fi = 0; fi < this._fogParticles.length; fi++) {
                var fp = this._fogParticles[fi];
                fp.mesh.visible = true;
                fp.mesh.material.opacity = t * 0.3;
                fp.mesh.position.set(fp.baseX, fp.baseY, 0.01);
                fp.mesh.scale.setScalar(fp.scale * t);
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Beam appears, fog starts to move
            var t2 = (progress - 0.10) / 0.20;

            this._beam.visible = true;
            this._beamGlow.visible = true;
            this._beam.material.opacity = t2 * 0.4;
            this._beamGlow.material.opacity = t2 * 0.15;

            // Fog drifts lazily
            for (var fj = 0; fj < this._fogParticles.length; fj++) {
                var fp2 = this._fogParticles[fj];
                fp2.mesh.material.opacity = 0.3 + Math.sin(time * 2 + fj) * 0.08;
                var drift = Math.sin(time * fp2.driftSpeed + fj) * 0.02;
                fp2.mesh.position.set(fp2.baseX + drift, fp2.baseY + Math.sin(time * 1.5 + fj * 0.5) * 0.01, 0.01);
            }

            model.position.set(ox, oy + Math.sin(time * 1.5) * 0.003, oz);
        } else if (progress < 0.55) {
            // Phase 3: Beam intensifies, fog retreats, layers peel
            var t3 = (progress - 0.30) / 0.25;
            this._beam.material.opacity = 0.4 + t3 * 0.2;
            this._beamGlow.material.opacity = 0.15 + t3 * 0.1;
            this._beam.scale.x = 1 + Math.sin(time * 4) * 0.05;

            // Fog retreats from beam direction
            for (var fk = 0; fk < this._fogParticles.length; fk++) {
                var fp3 = this._fogParticles[fk];
                var retreatDist = t3 * 0.3;
                var dx = fp3.baseX - (ox + 0.3);
                var dy = fp3.baseY - (oy + 0.15);
                var len = Math.sqrt(dx * dx + dy * dy) || 0.01;
                fp3.mesh.position.x = fp3.baseX + (dx / len) * retreatDist;
                fp3.mesh.position.y = fp3.baseY + (dy / len) * retreatDist;
                fp3.mesh.material.opacity = 0.3 * (1 - t3 * 0.6);
                fp3.mesh.scale.setScalar(fp3.scale * (1 - t3 * 0.4));
            }

            // Peel rings
            for (var ri = 0; ri < this._peelRings.length; ri++) {
                var pr = this._peelRings[ri];
                if (t3 > pr.peelTime && !pr.peeled) {
                    pr.peeled = true;
                }
                if (pr.peeled) {
                    pr.mesh.visible = true;
                    var peelProg = (t3 - pr.peelTime) * 3;
                    pr.mesh.scale.setScalar(1 + peelProg * pr.expandSpeed);
                    pr.mesh.material.opacity = Math.max(0, 0.4 * (1 - peelProg));
                }
            }

            // Mystery sphere becomes lighter
            this._mystery.material.color.setHex(0x556688);
            this._mystery.material.opacity = 0.6 - t3 * 0.2;

            model.position.set(ox, oy + Math.sin(time * 1.5) * 0.005, oz);
            model.rotation.z = Math.sin(time * 1) * 0.01;
        } else if (progress < 0.72) {
            // Phase 4: Core truth revealed
            var t4 = (progress - 0.55) / 0.17;

            this._truth.visible = true;
            this._truth.material.opacity = t4 * 0.9;
            this._truth.scale.setScalar(0.5 + t4 * 0.8);

            this._mystery.material.opacity = 0.4 * (1 - t4);

            // Beam strengthens
            this._beam.material.opacity = 0.6 + Math.sin(time * 5) * 0.1;
            this._beamGlow.material.opacity = 0.25 + Math.sin(time * 4) * 0.05;

            // Fog nearly gone
            for (var fl = 0; fl < this._fogParticles.length; fl++) {
                this._fogParticles[fl].mesh.material.opacity *= 0.95;
            }

            if (!this._clarityFired && t4 > 0.6) {
                this._fireClarity(ox + 0.3, oy + 0.15);
                this._clarityFired = true;
            }

            model.position.set(ox, oy + 0.005, oz);
        } else if (progress < 0.88) {
            // Phase 5: Clarity particles radiate, truth glows
            var t5 = (progress - 0.72) / 0.16;
            this._truth.material.opacity = 0.9;
            this._truth.scale.setScalar(1.3 + Math.sin(time * 3) * 0.1);

            this._beam.material.opacity = 0.6 * (1 - t5 * 0.5);
            this._beamGlow.material.opacity = 0.25 * (1 - t5 * 0.5);

            model.position.set(ox, oy + 0.005 * (1 - t5), oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;
            this._truth.material.opacity = 0.9 * (1 - t6);
            this._beam.material.opacity = 0.3 * (1 - t6);
            this._beamGlow.material.opacity = 0.12 * (1 - t6);

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update clarity particles
        for (var ci = 0; ci < this._clarityParticles.length; ci++) {
            var cp = this._clarityParticles[ci];
            if (cp.life <= 0) continue;
            cp.life -= delta;
            if (cp.life <= 0) { cp.mesh.visible = false; continue; }
            cp.mesh.position.x += cp.vx * delta;
            cp.mesh.position.y += cp.vy * delta;
            cp.mesh.position.z += cp.vz * delta;
            var lr = cp.life / cp.maxLife;
            cp.mesh.material.opacity = lr * 0.7;
            cp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._mystery) { scene.remove(this._mystery); this._mystery.geometry.dispose(); this._mystery.material.dispose(); }
        if (this._fogParticles) {
            this._fogParticles.forEach(function(f) {
                scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose();
            });
        }
        if (this._beam) { scene.remove(this._beam); this._beam.geometry.dispose(); this._beam.material.dispose(); }
        if (this._beamGlow) { scene.remove(this._beamGlow); this._beamGlow.geometry.dispose(); this._beamGlow.material.dispose(); }
        if (this._truth) { scene.remove(this._truth); this._truth.geometry.dispose(); this._truth.material.dispose(); }
        if (this._clarityParticles) {
            this._clarityParticles.forEach(function(c) {
                scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose();
            });
        }
        if (this._peelRings) {
            this._peelRings.forEach(function(r) {
                scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose();
            });
        }
        this._mystery = this._fogParticles = this._beam = this._beamGlow = null;
        this._truth = this._clarityParticles = this._peelRings = null;
    }
};
