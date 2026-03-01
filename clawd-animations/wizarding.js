export default {
    name: 'Wizarding',
    label: 'wizarding',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x, oy = this._origPos.y;

        // Staff cylinder (tall thin)
        var staffGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.8, 8);
        var staffMat = new THREE.MeshBasicMaterial({
            color: 0x664422, transparent: true, opacity: 0
        });
        this._staff = new THREE.Mesh(staffGeo, staffMat);
        this._staff.position.set(ox + 0.25, oy + 0.1, 0);
        this._staff.visible = false;
        scene.add(this._staff);

        // Staff orb (on top of staff)
        var orbGeo = new THREE.SphereGeometry(0.06, 12, 12);
        var orbMat = new THREE.MeshBasicMaterial({
            color: 0x6644ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._staffOrb = new THREE.Mesh(orbGeo, orbMat);
        this._staffOrb.position.set(ox + 0.25, oy + 0.54, 0);
        this._staffOrb.visible = false;
        scene.add(this._staffOrb);

        // Staff orb glow (larger, faint)
        var orbGlowGeo = new THREE.SphereGeometry(0.12, 10, 10);
        var orbGlowMat = new THREE.MeshBasicMaterial({
            color: 0x8866ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._orbGlow = new THREE.Mesh(orbGlowGeo, orbGlowMat);
        this._orbGlow.position.set(ox + 0.25, oy + 0.54, 0);
        this._orbGlow.visible = false;
        scene.add(this._orbGlow);

        // 3 bolt projectile spheres
        this._bolts = [];
        var boltColors = [0x4488ff, 0xaa44ff, 0xffcc22];
        for (var b = 0; b < 3; b++) {
            var bGeo = new THREE.SphereGeometry(0.05 + b * 0.015, 8, 8);
            var bMat = new THREE.MeshBasicMaterial({
                color: boltColors[b], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bolt = new THREE.Mesh(bGeo, bMat);
            bolt.visible = false;
            scene.add(bolt);
            this._bolts.push({
                mesh: bolt,
                color: boltColors[b],
                startX: ox + 0.25,
                startY: oy + 0.54,
                fired: false,
                progress: 0
            });
        }

        // 3 impact flash rings
        this._impacts = [];
        for (var f = 0; f < 3; f++) {
            var fGeo = new THREE.TorusGeometry(0.15, 0.05, 8, 24);
            var fMat = new THREE.MeshBasicMaterial({
                color: boltColors[f], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var impact = new THREE.Mesh(fGeo, fMat);
            impact.visible = false;
            scene.add(impact);
            this._impacts.push({
                mesh: impact,
                active: false,
                timer: 0
            });
        }

        // 20 energy particles
        this._particles = [];
        var pGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var p = 0; p < 20; p++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: p % 3 === 0 ? 0x6644ff : (p % 3 === 1 ? 0x4488ff : 0xaa66ff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var part = new THREE.Mesh(pGeo, pMat);
            part.visible = false;
            scene.add(part);
            this._particles.push({
                mesh: part, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._pIdx = 0;
    },
    _emitParticle(x, y, color) {
        var p = this._particles[this._pIdx % this._particles.length];
        this._pIdx++;
        p.mesh.visible = true;
        p.mesh.position.set(x, y, 0);
        p.mesh.material.color.setHex(color);
        var angle = Math.random() * Math.PI * 2;
        var spd = 0.5 + Math.random() * 1.5;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.vz = (Math.random() - 0.5) * 0.5;
        p.life = 0.3 + Math.random() * 0.4;
        p.maxLife = p.life;
        p.mesh.material.opacity = 1.0;
    },
    _triggerImpact(idx, x, y) {
        var imp = this._impacts[idx];
        imp.mesh.visible = true;
        imp.mesh.position.set(x, y, 0);
        imp.mesh.rotation.x = Math.PI / 2;
        imp.mesh.scale.set(0.1, 0.1, 0.1);
        imp.mesh.material.opacity = 0.9;
        imp.active = true;
        imp.timer = 0;
        for (var i = 0; i < 4; i++) {
            this._emitParticle(x, y, this._bolts[idx].color);
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x, oy = this._origPos.y;

        if (progress < 0.10) {
            // Phase 1: Staff materializes
            var t = progress / 0.10;
            var ease = 1 - Math.pow(1 - t, 3);

            this._staff.visible = true;
            this._staff.material.opacity = ease * 0.9;
            this._staff.scale.set(ease, ease, ease);

            this._staffOrb.visible = true;
            this._staffOrb.material.opacity = ease * 0.5;
            this._staffOrb.scale.setScalar(ease);

            this._orbGlow.visible = true;
            this._orbGlow.material.opacity = ease * 0.15;
            this._orbGlow.scale.setScalar(ease);
        } else if (progress < 0.25) {
            // Phase 2: Orb charges, energy particles gather
            var t2 = (progress - 0.10) / 0.15;

            this._staff.material.opacity = 0.9;
            this._staffOrb.material.opacity = 0.5 + t2 * 0.4 + Math.sin(time * 8) * 0.1;
            this._staffOrb.scale.setScalar(1.0 + Math.sin(time * 6) * 0.15 * t2);
            this._orbGlow.material.opacity = 0.15 + t2 * 0.2 + Math.sin(time * 5) * 0.05;
            this._orbGlow.scale.setScalar(1.0 + Math.sin(time * 4) * 0.2 * t2);

            // Gathering particles toward orb
            if (Math.random() < t2 * 0.4) {
                var angle = Math.random() * Math.PI * 2;
                var dist = 0.3 + Math.random() * 0.2;
                var px = ox + 0.25 + Math.cos(angle) * dist;
                var py = oy + 0.54 + Math.sin(angle) * dist;
                this._emitParticle(px, py, 0x6644ff);
            }

            model.rotation.z = Math.sin(time * 2) * 0.02;
        } else if (progress < 0.45) {
            // Phase 3: First bolt fires with impact
            var t3 = (progress - 0.25) / 0.20;

            // Aim staff
            this._staff.rotation.z = -0.3;
            this._staffOrb.position.set(ox + 0.4, oy + 0.45, 0);
            this._orbGlow.position.set(ox + 0.4, oy + 0.45, 0);
            this._staff.position.set(ox + 0.3, oy + 0.05, 0);

            var bolt0 = this._bolts[0];
            if (t3 < 0.4) {
                // Bolt fires
                var boltT = t3 / 0.4;
                bolt0.mesh.visible = true;
                bolt0.mesh.material.opacity = 0.9;
                bolt0.mesh.position.set(
                    ox + 0.4 + boltT * 1.2,
                    oy + 0.45 - boltT * 0.3,
                    0
                );
                bolt0.mesh.scale.setScalar(1.0 + boltT * 0.5);

                this._staffOrb.material.opacity = 0.9 - boltT * 0.3;
            } else {
                bolt0.mesh.visible = false;
                if (!bolt0.fired) {
                    bolt0.fired = true;
                    this._triggerImpact(0, ox + 1.6, oy + 0.15);
                }
            }

            this._staffOrb.material.opacity = 0.6 + Math.sin(time * 6) * 0.1;
            model.rotation.z = -0.05;
        } else if (progress < 0.60) {
            // Phase 4: Second bolt, different color
            var t4 = (progress - 0.45) / 0.15;

            var bolt1 = this._bolts[1];
            if (t4 < 0.5) {
                var boltT2 = t4 / 0.5;
                bolt1.mesh.visible = true;
                bolt1.mesh.material.opacity = 0.9;
                bolt1.mesh.position.set(
                    ox + 0.4 + boltT2 * 1.0,
                    oy + 0.45 + boltT2 * 0.2,
                    0
                );
                bolt1.mesh.scale.setScalar(1.0 + boltT2 * 0.6);
            } else {
                bolt1.mesh.visible = false;
                if (!bolt1.fired) {
                    bolt1.fired = true;
                    this._triggerImpact(1, ox + 1.4, oy + 0.65);
                }
            }

            this._staffOrb.material.opacity = 0.7 + Math.sin(time * 8) * 0.15;
            model.rotation.z = -0.06;
        } else if (progress < 0.75) {
            // Phase 5: Third bolt, biggest
            var t5 = (progress - 0.60) / 0.15;

            var bolt2 = this._bolts[2];
            if (t5 < 0.5) {
                // Charge up
                this._staffOrb.scale.setScalar(1.0 + t5 * 0.6 + Math.sin(time * 10) * 0.1);
                this._staffOrb.material.opacity = 0.9;
                this._orbGlow.material.opacity = 0.3 + t5 * 0.2;
                this._orbGlow.scale.setScalar(1.0 + t5 * 0.8);
            }
            if (t5 > 0.3 && t5 < 0.8) {
                var boltT3 = (t5 - 0.3) / 0.5;
                bolt2.mesh.visible = true;
                bolt2.mesh.material.opacity = 0.9;
                bolt2.mesh.position.set(
                    ox + 0.4 + boltT3 * 1.3,
                    oy + 0.45,
                    0
                );
                bolt2.mesh.scale.setScalar(1.2 + boltT3 * 0.8);
            } else if (t5 >= 0.8) {
                bolt2.mesh.visible = false;
                if (!bolt2.fired) {
                    bolt2.fired = true;
                    this._triggerImpact(2, ox + 1.7, oy + 0.45);
                }
            }

            model.rotation.z = -0.07;
        } else if (progress < 0.90) {
            // Phase 6: Staff crackles, residual glow
            var t6 = (progress - 0.75) / 0.15;

            this._staff.rotation.z = Math.sin(time * 8) * 0.02;
            this._staff.position.set(ox + 0.25, oy + 0.1, 0);
            this._staffOrb.position.set(ox + 0.25, oy + 0.54, 0);
            this._orbGlow.position.set(ox + 0.25, oy + 0.54, 0);

            this._staffOrb.scale.setScalar(1.0 + Math.sin(time * 12) * 0.08 * (1 - t6));
            this._staffOrb.material.opacity = 0.6 * (1 - t6 * 0.5);
            this._orbGlow.material.opacity = 0.15 * (1 - t6);
            this._orbGlow.scale.setScalar(1.0);

            // Crackle particles
            if (Math.random() < 0.15 * (1 - t6)) {
                this._emitParticle(ox + 0.25, oy + 0.54, 0x8866ff);
            }

            model.rotation.z = -0.07 * (1 - t6);
            model.position.copy(this._origPos);
        } else {
            // Phase 7: Fade
            var t7 = (progress - 0.90) / 0.10;

            this._staff.material.opacity = 0.9 * (1 - t7);
            this._staffOrb.material.opacity = 0.3 * (1 - t7);
            this._orbGlow.material.opacity = 0;

            model.position.copy(this._origPos);
            model.rotation.z = 0;
        }

        // Update impact flash rings
        for (var fi = 0; fi < this._impacts.length; fi++) {
            var imp = this._impacts[fi];
            if (!imp.active) continue;
            imp.timer += delta;
            if (imp.timer > 0.5) {
                imp.active = false;
                imp.mesh.visible = false;
                continue;
            }
            var impT = imp.timer / 0.5;
            imp.mesh.scale.setScalar(0.1 + impT * 2.5);
            imp.mesh.material.opacity = (1 - impT) * 0.8;
        }

        // Update particles
        for (var pi = 0; pi < this._particles.length; pi++) {
            var pp = this._particles[pi];
            if (pp.life <= 0) continue;
            pp.life -= delta;
            if (pp.life <= 0) { pp.mesh.visible = false; continue; }
            pp.mesh.position.x += pp.vx * delta;
            pp.mesh.position.y += pp.vy * delta;
            pp.mesh.position.z += pp.vz * delta;
            pp.vy -= 1.5 * delta;
            var lr = pp.life / pp.maxLife;
            pp.mesh.material.opacity = lr;
            pp.mesh.scale.setScalar(0.3 + 0.7 * lr);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._staff) { scene.remove(this._staff); this._staff.geometry.dispose(); this._staff.material.dispose(); }
        if (this._staffOrb) { scene.remove(this._staffOrb); this._staffOrb.geometry.dispose(); this._staffOrb.material.dispose(); }
        if (this._orbGlow) { scene.remove(this._orbGlow); this._orbGlow.geometry.dispose(); this._orbGlow.material.dispose(); }
        if (this._bolts) { this._bolts.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._impacts) { this._impacts.forEach(function(i) { scene.remove(i.mesh); i.mesh.geometry.dispose(); i.mesh.material.dispose(); }); }
        if (this._particles) { this._particles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        this._staff = this._staffOrb = this._orbGlow = this._bolts = this._impacts = this._particles = null;
    }
};
