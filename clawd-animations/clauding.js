import { cloneWithMaterials, setCloneOpacity, disposeClone } from './helpers.js';

export default {
    name: 'Clauding',
    label: 'clauding',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var gs = this._origScale.x;

        // Claude brand glow sphere (terracotta orange)
        var glowGeo = new THREE.SphereGeometry(0.3, 16, 16);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xD97757, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.copy(this._origPos);
        scene.add(this._glow);

        // Level 1 clones: 3 copies orbiting at radius 0.5, scale 0.5x
        this._level1 = [];
        for (var i = 0; i < 3; i++) {
            var c1 = cloneWithMaterials(model);
            c1.scale.setScalar(gs * 0.5);
            setCloneOpacity(c1, 0);
            c1.visible = false;
            scene.add(c1);
            this._level1.push({ clone: c1, angle: (Math.PI * 2 / 3) * i, radius: 0.5 });
        }

        // Level 2 clones: 6 copies orbiting level1 at radius 0.22, scale 0.25x
        this._level2 = [];
        for (var j = 0; j < 6; j++) {
            var c2 = cloneWithMaterials(model);
            c2.scale.setScalar(gs * 0.25);
            setCloneOpacity(c2, 0);
            c2.visible = false;
            scene.add(c2);
            this._level2.push({ clone: c2, parentIdx: j % 3, angle: (j % 2 === 0) ? 0 : Math.PI, radius: 0.22 });
        }

        // Merge particles (Claude orange and cream)
        this._particles = [];
        var pGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var k = 0; k < 20; k++) {
            var pColor = k % 3 === 0 ? 0xD97757 : (k % 3 === 1 ? 0xFAF3E8 : 0xE8956A);
            var pMat = new THREE.MeshBasicMaterial({
                color: pColor, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var p = new THREE.Mesh(pGeo, pMat);
            p.visible = false;
            scene.add(p);
            this._particles.push({ mesh: p, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._pIdx = 0;

        // Inner cream glow
        var innerGeo = new THREE.SphereGeometry(0.15, 12, 12);
        var innerMat = new THREE.MeshBasicMaterial({
            color: 0xFAF3E8, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._innerGlow = new THREE.Mesh(innerGeo, innerMat);
        this._innerGlow.position.copy(this._origPos);
        scene.add(this._innerGlow);
    },
    _burstMergeParticles(x, y) {
        for (var i = 0; i < 5; i++) {
            var p = this._particles[this._pIdx % this._particles.length];
            this._pIdx++;
            p.mesh.visible = true;
            p.mesh.position.set(x, y, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.0 + Math.random() * 2.0;
            p.vx = Math.cos(a) * spd;
            p.vy = Math.sin(a) * spd;
            p.vz = (Math.random() - 0.5) * 1.0;
            p.life = 0.4 + Math.random() * 0.4;
            p.maxLife = p.life;
            p.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.10) {
            // Phase 1: Model pulses with Claude orange glow
            var t = progress / 0.10;
            var pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
            this._glow.material.opacity = t * 0.3 * pulse;
            this._glow.scale.setScalar(1.0 + pulse * 0.3);
            this._innerGlow.material.opacity = t * 0.2;
            model.scale.setScalar(gs * (1.0 + pulse * 0.03));
        } else if (progress < 0.25) {
            // Phase 2: First level duplicates spawn and begin orbiting
            var t2 = (progress - 0.10) / 0.15;
            this._glow.material.opacity = 0.25 + Math.sin(time * 3) * 0.05;
            this._glow.scale.setScalar(1.2);
            this._innerGlow.material.opacity = 0.15;
            model.scale.setScalar(gs);

            for (var i = 0; i < this._level1.length; i++) {
                var l1 = this._level1[i];
                l1.clone.visible = true;
                var spawnT = Math.min(t2 * 3 - i * 0.5, 1.0);
                if (spawnT < 0) spawnT = 0;
                var easeSpawn = spawnT * spawnT;
                setCloneOpacity(l1.clone, easeSpawn * 0.7);
                l1.clone.scale.setScalar(gs * 0.5 * easeSpawn);
                var currentAngle = l1.angle + time * 1.2;
                var currentRadius = l1.radius * easeSpawn;
                l1.clone.position.set(
                    orig.x + Math.cos(currentAngle) * currentRadius,
                    orig.y + Math.sin(currentAngle) * currentRadius,
                    0
                );
            }
        } else if (progress < 0.45) {
            // Phase 3: Second level duplicates appear
            var t3 = (progress - 0.25) / 0.20;
            this._glow.material.opacity = 0.25 + Math.sin(time * 3) * 0.05;
            this._innerGlow.material.opacity = 0.15;

            // Level 1 keeps orbiting
            for (var j = 0; j < this._level1.length; j++) {
                var l1b = this._level1[j];
                setCloneOpacity(l1b.clone, 0.7);
                l1b.clone.scale.setScalar(gs * 0.5);
                var angle1 = l1b.angle + time * 1.2;
                l1b.clone.position.set(
                    orig.x + Math.cos(angle1) * l1b.radius,
                    orig.y + Math.sin(angle1) * l1b.radius,
                    0
                );
            }

            // Level 2 spawns orbiting their parents
            for (var k = 0; k < this._level2.length; k++) {
                var l2 = this._level2[k];
                var parent = this._level1[l2.parentIdx];
                l2.clone.visible = true;
                var spawnT2 = Math.min(t3 * 3 - k * 0.3, 1.0);
                if (spawnT2 < 0) spawnT2 = 0;
                var easeSpawn2 = spawnT2 * spawnT2;
                setCloneOpacity(l2.clone, easeSpawn2 * 0.5);
                l2.clone.scale.setScalar(gs * 0.25 * easeSpawn2);
                var angle2 = l2.angle + time * 2.5;
                l2.clone.position.set(
                    parent.clone.position.x + Math.cos(angle2) * l2.radius * easeSpawn2,
                    parent.clone.position.y + Math.sin(angle2) * l2.radius * easeSpawn2,
                    0
                );
            }
        } else if (progress < 0.70) {
            // Phase 4: All orbiting in nested fractal pattern
            var t4 = (progress - 0.45) / 0.25;
            this._glow.material.opacity = 0.2 + Math.sin(time * 4) * 0.1;
            this._glow.scale.setScalar(1.2 + Math.sin(time * 2) * 0.15);
            this._innerGlow.material.opacity = 0.1 + Math.sin(time * 5) * 0.05;

            // Pulsing model
            var modelPulse = 1.0 + Math.sin(time * 3) * 0.02;
            model.scale.setScalar(gs * modelPulse);
            model.rotation.z = Math.sin(time * 1.5) * 0.03;

            // Level 1 orbiting with slight vertical bob
            for (var m = 0; m < this._level1.length; m++) {
                var l1c = this._level1[m];
                var angle1c = l1c.angle + time * 1.2;
                var bob = Math.sin(time * 3 + m) * 0.03;
                l1c.clone.position.set(
                    orig.x + Math.cos(angle1c) * l1c.radius,
                    orig.y + Math.sin(angle1c) * l1c.radius + bob,
                    0
                );
                l1c.clone.rotation.z = Math.sin(time * 2 + m) * 0.1;
            }

            // Level 2 orbiting parents with faster spin
            for (var n = 0; n < this._level2.length; n++) {
                var l2b = this._level2[n];
                var parentB = this._level1[l2b.parentIdx];
                var angle2b = l2b.angle + time * 2.5;
                l2b.clone.position.set(
                    parentB.clone.position.x + Math.cos(angle2b) * l2b.radius,
                    parentB.clone.position.y + Math.sin(angle2b) * l2b.radius,
                    0
                );
                l2b.clone.rotation.z = Math.sin(time * 4 + n) * 0.15;
            }
        } else if (progress < 0.85) {
            // Phase 5: Duplicates converge back, merge flash
            var t5 = (progress - 0.70) / 0.15;
            var easeIn = t5 * t5;

            model.rotation.z = 0;
            model.scale.setScalar(gs);

            // Level 2 converges to level 1
            for (var p = 0; p < this._level2.length; p++) {
                var l2c = this._level2[p];
                var parentC = this._level1[l2c.parentIdx];
                var angle2c = l2c.angle + time * 2.5;
                var shrinkRadius = l2c.radius * (1 - easeIn);
                l2c.clone.position.set(
                    parentC.clone.position.x + Math.cos(angle2c) * shrinkRadius,
                    parentC.clone.position.y + Math.sin(angle2c) * shrinkRadius,
                    0
                );
                setCloneOpacity(l2c.clone, 0.5 * (1 - easeIn));
                l2c.clone.scale.setScalar(gs * 0.25 * (1 - easeIn));
                if (easeIn > 0.9) l2c.clone.visible = false;
            }

            // Level 1 converges to model
            for (var q = 0; q < this._level1.length; q++) {
                var l1d = this._level1[q];
                var angle1d = l1d.angle + time * 1.2;
                var shrinkR1 = l1d.radius * (1 - easeIn);
                l1d.clone.position.set(
                    orig.x + Math.cos(angle1d) * shrinkR1,
                    orig.y + Math.sin(angle1d) * shrinkR1,
                    0
                );
                setCloneOpacity(l1d.clone, 0.7 * (1 - easeIn));
                l1d.clone.scale.setScalar(gs * 0.5 * (1 - easeIn));
                if (easeIn > 0.9) l1d.clone.visible = false;
            }

            // Merge flash at convergence point
            if (t5 > 0.7 && t5 < 0.85) {
                this._glow.material.opacity = 0.6;
                this._glow.scale.setScalar(2.0);
                this._innerGlow.material.opacity = 0.5;
                this._burstMergeParticles(orig.x, orig.y);
            } else {
                this._glow.material.opacity = 0.25 * (1 - easeIn);
            }
        } else {
            // Phase 6: Warm glow settle
            var t6 = (progress - 0.85) / 0.15;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            // Hide all clones
            for (var r = 0; r < this._level1.length; r++) {
                this._level1[r].clone.visible = false;
            }
            for (var s = 0; s < this._level2.length; s++) {
                this._level2[s].clone.visible = false;
            }

            // Fade glow
            this._glow.material.opacity = 0.4 * (1 - t6);
            this._glow.scale.setScalar(1.5 + t6 * 0.5);
            this._innerGlow.material.opacity = 0.3 * (1 - t6);
        }

        // Update merge particles
        for (var pi = 0; pi < this._particles.length; pi++) {
            var pp = this._particles[pi];
            if (pp.life <= 0) continue;
            pp.life -= delta;
            if (pp.life <= 0) { pp.mesh.visible = false; continue; }
            pp.mesh.position.x += pp.vx * delta;
            pp.mesh.position.y += pp.vy * delta;
            pp.mesh.position.z += pp.vz * delta;
            pp.vy -= 1.5 * delta;
            pp.mesh.material.opacity = (pp.life / pp.maxLife) * 0.8;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._innerGlow) { scene.remove(this._innerGlow); this._innerGlow.geometry.dispose(); this._innerGlow.material.dispose(); }
        if (this._level1) { this._level1.forEach(function(l) { scene.remove(l.clone); disposeClone(l.clone); }); }
        if (this._level2) { this._level2.forEach(function(l) { scene.remove(l.clone); disposeClone(l.clone); }); }
        if (this._particles) { this._particles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        this._glow = this._innerGlow = this._level1 = this._level2 = this._particles = null;
    }
};
