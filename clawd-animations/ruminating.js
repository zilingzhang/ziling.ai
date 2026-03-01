export default {
    name: 'Ruminating',
    label: 'ruminating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Thought ball (sphere that goes in circles, shrinks/refines each pass)
        var tbGeo = new THREE.SphereGeometry(0.08, 12, 12);
        var tbMat = new THREE.MeshBasicMaterial({
            color: 0xddaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._thoughtBall = new THREE.Mesh(tbGeo, tbMat);
        this._thoughtBall.position.set(ox + 0.2, oy + 0.1, 0.02);
        this._thoughtBall.visible = false;
        scene.add(this._thoughtBall);

        // Inner refined core (glows brighter as processing continues)
        var coreGeo = new THREE.SphereGeometry(0.04, 10, 10);
        var coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._core = new THREE.Mesh(coreGeo, coreMat);
        this._core.visible = false;
        scene.add(this._core);

        // Orbit trail particles (follow the thought ball path)
        this._trailParticles = [];
        var trGeo = new THREE.SphereGeometry(0.012, 5, 5);
        for (var i = 0; i < 18; i++) {
            var trMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xddaa44 : (i % 3 === 1 ? 0xccbb55 : 0xeebb33),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tr = new THREE.Mesh(trGeo, trMat);
            tr.visible = false;
            scene.add(tr);
            this._trailParticles.push({
                mesh: tr,
                life: 0, maxLife: 0,
                x: 0, y: 0
            });
        }
        this._trailIdx = 0;

        // Cycle count indicator rings (one per completed cycle)
        this._cycleRings = [];
        for (var c = 0; c < 5; c++) {
            var crGeo = new THREE.TorusGeometry(0.15 + c * 0.04, 0.003, 6, 24);
            var crMat = new THREE.MeshBasicMaterial({
                color: 0xddcc66, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cr = new THREE.Mesh(crGeo, crMat);
            cr.position.set(ox, oy + 0.1, -0.01);
            cr.rotation.x = Math.PI * 0.5;
            cr.visible = false;
            scene.add(cr);
            this._cycleRings.push({ mesh: cr, active: false });
        }

        // Distilled wisdom glow at end
        var wisGeo = new THREE.SphereGeometry(0.15, 10, 10);
        var wisMat = new THREE.MeshBasicMaterial({
            color: 0xffeedd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._wisdomGlow = new THREE.Mesh(wisGeo, wisMat);
        this._wisdomGlow.position.set(ox, oy + 0.15, 0.02);
        this._wisdomGlow.visible = false;
        scene.add(this._wisdomGlow);

        this._orbitAngle = 0;
        this._cycleCount = 0;
        this._lastTrailSpawn = 0;
        this._currentSize = 1.0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        // Orbit parameters
        var orbitRadius = 0.22;
        var orbitCenter = { x: ox, y: oy + 0.1 };

        if (progress < 0.08) {
            // Phase 1: Thought ball appears
            var t = progress / 0.08;
            this._thoughtBall.visible = true;
            this._thoughtBall.material.opacity = t * 0.7;
            this._thoughtBall.scale.setScalar(t);

            this._orbitAngle = 0;
            var bx = orbitCenter.x + Math.cos(this._orbitAngle) * orbitRadius;
            var by = orbitCenter.y + Math.sin(this._orbitAngle) * orbitRadius * 0.5;
            this._thoughtBall.position.set(bx, by, 0.02);

            model.position.set(ox, oy, oz);
        } else if (progress < 0.80) {
            // Phase 2-4: Multiple passes, ball shrinks and glows more each cycle
            var t2 = (progress - 0.08) / 0.72;
            var cyclesTotal = 5;
            var currentCycleFloat = t2 * cyclesTotal;
            var currentCycle = Math.floor(currentCycleFloat);
            var cycleProgress = currentCycleFloat - currentCycle;

            // Update orbit angle
            this._orbitAngle = cycleProgress * Math.PI * 2;
            var bx2 = orbitCenter.x + Math.cos(this._orbitAngle) * orbitRadius;
            var by2 = orbitCenter.y + Math.sin(this._orbitAngle) * orbitRadius * 0.5;
            this._thoughtBall.position.set(bx2, by2, 0.02);

            // Shrink ball each cycle (becomes more refined)
            var shrinkFactor = 1.0 - (currentCycle / cyclesTotal) * 0.5;
            this._thoughtBall.scale.setScalar(shrinkFactor);
            this._currentSize = shrinkFactor;

            // Ball gets brighter/more refined
            var refinement = currentCycle / cyclesTotal;
            var r = Math.floor((1 - refinement) * 0xdd + refinement * 0xff);
            var g = Math.floor((1 - refinement) * 0xaa + refinement * 0xee);
            var b = Math.floor((1 - refinement) * 0x44 + refinement * 0xdd);
            this._thoughtBall.material.color.setRGB(r / 255, g / 255, b / 255);
            this._thoughtBall.material.opacity = 0.7 + refinement * 0.2;

            // Show inner core as refinement increases
            if (refinement > 0.3) {
                this._core.visible = true;
                this._core.position.copy(this._thoughtBall.position);
                this._core.material.opacity = (refinement - 0.3) * 0.8;
                this._core.scale.setScalar(shrinkFactor * 0.5);
            }

            // Activate cycle rings
            if (currentCycle > this._cycleCount && currentCycle < 5) {
                this._cycleCount = currentCycle;
                if (currentCycle - 1 >= 0 && currentCycle - 1 < 5) {
                    this._cycleRings[currentCycle - 1].active = true;
                    this._cycleRings[currentCycle - 1].mesh.visible = true;
                }
            }

            // Trail particles
            if (time - this._lastTrailSpawn > 0.1) {
                var tp = this._trailParticles[this._trailIdx % this._trailParticles.length];
                this._trailIdx++;
                tp.mesh.visible = true;
                tp.x = bx2;
                tp.y = by2;
                tp.mesh.position.set(bx2, by2, 0.01);
                tp.life = 0.4 + Math.random() * 0.3;
                tp.maxLife = tp.life;
                tp.mesh.material.opacity = 0.5 * shrinkFactor;
                tp.mesh.scale.setScalar(shrinkFactor);
                this._lastTrailSpawn = time;
            }

            // Model chewing motion (subtle jaw y-scale oscillation)
            var chewSpeed = 4 + refinement * 2;
            var chew = Math.sin(time * chewSpeed) * 0.008;
            model.scale.set(this._origScale.x, this._origScale.y + chew, this._origScale.z);
            model.position.set(ox, oy + Math.sin(time * 0.8) * 0.003, oz);
            model.rotation.z = Math.sin(time * 0.5) * 0.01;
        } else if (progress < 0.92) {
            // Phase 5: Distilled wisdom emerges
            var t5 = (progress - 0.80) / 0.12;
            this._thoughtBall.material.opacity = 0.9 * (1 - t5);
            this._thoughtBall.scale.setScalar(this._currentSize * (1 - t5 * 0.5));

            // Wisdom glow appears
            this._wisdomGlow.visible = true;
            this._wisdomGlow.material.opacity = t5 * 0.5;
            this._wisdomGlow.scale.setScalar(0.5 + t5 * 0.8);
            this._wisdomGlow.position.set(ox, oy + 0.15, 0.02);

            this._core.material.opacity = 0.6 * (1 - t5 * 0.5);

            // Cycle rings pulse
            for (var ri = 0; ri < 5; ri++) {
                if (this._cycleRings[ri].active) {
                    this._cycleRings[ri].mesh.material.opacity = 0.3 + Math.sin(time * 3 + ri) * 0.1;
                }
            }

            model.scale.copy(this._origScale);
            model.position.set(ox, oy + t5 * 0.005, oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.92) / 0.08;
            this._wisdomGlow.material.opacity = 0.5 * (1 - t6);
            this._thoughtBall.material.opacity = 0;
            this._core.material.opacity = 0;

            for (var rj = 0; rj < 5; rj++) {
                if (this._cycleRings[rj].active) {
                    this._cycleRings[rj].mesh.material.opacity = 0.3 * (1 - t6);
                }
            }

            model.position.set(ox, oy + 0.005 * (1 - t6), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update trail particles
        for (var ti = 0; ti < this._trailParticles.length; ti++) {
            var trail = this._trailParticles[ti];
            if (trail.life <= 0) continue;
            trail.life -= delta;
            if (trail.life <= 0) { trail.mesh.visible = false; continue; }
            var lr = trail.life / trail.maxLife;
            trail.mesh.material.opacity = lr * 0.4;
            trail.mesh.scale.setScalar(lr * this._currentSize);
        }

        // Update cycle rings (subtle rotation)
        for (var rk = 0; rk < 5; rk++) {
            if (this._cycleRings[rk].active) {
                this._cycleRings[rk].mesh.rotation.z += delta * (0.2 + rk * 0.1);
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._thoughtBall) { scene.remove(this._thoughtBall); this._thoughtBall.geometry.dispose(); this._thoughtBall.material.dispose(); }
        if (this._core) { scene.remove(this._core); this._core.geometry.dispose(); this._core.material.dispose(); }
        if (this._trailParticles) {
            this._trailParticles.forEach(function(t) {
                scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose();
            });
        }
        if (this._cycleRings) {
            this._cycleRings.forEach(function(c) {
                scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose();
            });
        }
        if (this._wisdomGlow) { scene.remove(this._wisdomGlow); this._wisdomGlow.geometry.dispose(); this._wisdomGlow.material.dispose(); }
        this._thoughtBall = this._core = this._trailParticles = this._cycleRings = this._wisdomGlow = null;
    }
};
