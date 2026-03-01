export default {
    name: 'Wrangling',
    label: 'wrangling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Lasso rope (torus spinning above model)
        var lassoGeo = new THREE.TorusGeometry(0.1, 0.01, 8, 24);
        var lassoMat = new THREE.MeshBasicMaterial({
            color: 0xccaa66, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._lasso = new THREE.Mesh(lassoGeo, lassoMat);
        this._lasso.position.set(ox, oy + 0.25, 0);
        scene.add(this._lasso);

        // Rope arc line (stretches from lasso to target)
        this._ropePts = [];
        for (var rp = 0; rp < 12; rp++) {
            this._ropePts.push(new THREE.Vector3(0, 0, 0));
        }
        var ropeGeo = new THREE.BufferGeometry().setFromPoints(this._ropePts);
        var ropeMat = new THREE.LineBasicMaterial({
            color: 0xbbaa55, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending
        });
        this._rope = new THREE.Line(ropeGeo, ropeMat);
        this._rope.visible = false;
        scene.add(this._rope);

        // Targets to wrangle (spheres at various positions)
        this._targets = [];
        var targetGeo = new THREE.SphereGeometry(0.06, 8, 8);
        var targetPositions = [
            { x: ox + 0.5, y: oy + 0.1 },
            { x: ox + 0.4, y: oy - 0.15 },
            { x: ox + 0.6, y: oy + 0.2 }
        ];
        var targetColors = [0xcc6644, 0xdd7755, 0xbb5533];
        for (var i = 0; i < 3; i++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: targetColors[i], transparent: true, opacity: 0,
                depthWrite: false
            });
            var target = new THREE.Mesh(targetGeo, tMat);
            target.position.set(targetPositions[i].x, targetPositions[i].y, 0);
            scene.add(target);
            this._targets.push({
                mesh: target,
                homeX: targetPositions[i].x,
                homeY: targetPositions[i].y,
                wrangled: false,
                wrangleT: 0
            });
        }

        // Rope particles (texture along rope)
        this._ropeParts = [];
        var rpGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var j = 0; j < 15; j++) {
            var rpMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xddbb77 : 0xccaa55, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var rPart = new THREE.Mesh(rpGeo, rpMat);
            rPart.visible = false;
            scene.add(rPart);
            this._ropeParts.push({ mesh: rPart, life: 0, maxLife: 0, vx: 0, vy: 0 });
        }
        this._rpIdx = 0;

        // Dust particles
        this._dustParts = [];
        var dustGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var k = 0; k < 20; k++) {
            var dColors = [0xddaa66, 0xccbb77, 0xbb9955, 0xeebb88];
            var dMat = new THREE.MeshBasicMaterial({
                color: dColors[k % dColors.length], transparent: true, opacity: 0,
                depthWrite: false
            });
            var dp = new THREE.Mesh(dustGeo, dMat);
            dp.visible = false;
            scene.add(dp);
            this._dustParts.push({ mesh: dp, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, grow: 0 });
        }
        this._dustIdx = 0;

        // Sunset glow (background warm tone)
        var sunGeo = new THREE.SphereGeometry(0.5, 12, 12);
        var sunMat = new THREE.MeshBasicMaterial({
            color: 0xff8844, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
        });
        this._sunGlow = new THREE.Mesh(sunGeo, sunMat);
        this._sunGlow.position.set(ox + 0.3, oy + 0.3, -0.1);
        scene.add(this._sunGlow);

        // Wrangled pile position
        this._pileX = ox - 0.2;
        this._pileY = oy - 0.15;

        this._currentTarget = 0;
        this._lassoAngle = 0;
        this._throwPhase = 'spin'; // spin, throw, pull, reset
        this._throwTimer = 0;
        this._lastDust = 0;
    },
    _emitDust(x, y) {
        for (var i = 0; i < 3; i++) {
            var d = this._dustParts[this._dustIdx % this._dustParts.length];
            this._dustIdx++;
            d.mesh.visible = true;
            d.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y - 0.05, 0);
            d.vx = (Math.random() - 0.5) * 1.0;
            d.vy = 0.3 + Math.random() * 0.5;
            d.vz = (Math.random() - 0.5) * 0.3;
            d.life = 0.5 + Math.random() * 0.3;
            d.maxLife = d.life;
            d.mesh.material.opacity = 0.4;
            d.mesh.scale.setScalar(0.5);
            d.grow = 1.5 + Math.random();
        }
    },
    _emitRopeParticle(x, y) {
        var r = this._ropeParts[this._rpIdx % this._ropeParts.length];
        this._rpIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(x, y, 0);
        r.vx = (Math.random() - 0.5) * 0.5;
        r.vy = (Math.random() - 0.5) * 0.5;
        r.life = 0.2 + Math.random() * 0.15;
        r.maxLife = r.life;
        r.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        // Sunset glow background
        if (progress < 0.05) {
            var t0 = progress / 0.05;
            this._sunGlow.material.opacity = t0 * 0.08;
        } else if (progress < 0.90) {
            this._sunGlow.material.opacity = 0.08 + Math.sin(time * 0.5) * 0.02;
        } else {
            this._sunGlow.material.opacity = 0.08 * (1 - (progress - 0.90) / 0.10);
        }

        if (progress < 0.05) {
            // Phase 1: Setup - targets appear
            var t = progress / 0.05;
            for (var ti = 0; ti < this._targets.length; ti++) {
                this._targets[ti].mesh.material.opacity = t * 0.6;
            }
            this._lasso.material.opacity = t * 0.7;
            model.position.set(ox - 0.3, oy, oz);
        } else if (progress < 0.82) {
            // Phase 2-4: Wrangle attempts (one per target)
            var wrangleProgress = (progress - 0.05) / 0.77;
            var attemptsPerTarget = 1.0 / 3;
            var currentAttempt = Math.min(2, Math.floor(wrangleProgress / attemptsPerTarget));
            var attemptT = (wrangleProgress - currentAttempt * attemptsPerTarget) / attemptsPerTarget;

            model.position.set(ox - 0.3, oy + Math.sin(time * 2) * 0.01, oz);

            // Lasso spin above head
            this._lassoAngle += delta * (6 + Math.sin(time * 2) * 1);

            if (attemptT < 0.30) {
                // Spinning lasso
                var spinT = attemptT / 0.30;
                this._lasso.position.set(
                    ox - 0.3 + Math.cos(this._lassoAngle) * 0.05,
                    oy + 0.22 + Math.sin(this._lassoAngle * 0.5) * 0.03,
                    Math.sin(this._lassoAngle) * 0.05
                );
                this._lasso.rotation.x = Math.sin(this._lassoAngle) * 0.5;
                this._lasso.rotation.y = this._lassoAngle;
                this._lasso.material.opacity = 0.7;
                this._rope.visible = false;

                model.rotation.z = Math.sin(this._lassoAngle * 0.3) * 0.05;
            } else if (attemptT < 0.55) {
                // Throwing lasso toward target
                var throwT = (attemptT - 0.30) / 0.25;
                var target = this._targets[currentAttempt];

                // Lasso flies toward target
                var lassoX = ox - 0.3 + (target.homeX - (ox - 0.3)) * throwT;
                var lassoY = oy + 0.22 + (target.homeY - (oy + 0.22)) * throwT;
                var arcHeight = Math.sin(throwT * Math.PI) * 0.15;
                this._lasso.position.set(lassoX, lassoY + arcHeight, 0);
                this._lasso.rotation.y += delta * 10;
                this._lasso.scale.setScalar(1 + throwT * 0.3);

                // Rope arc connects model to lasso
                this._rope.visible = true;
                var positions = this._rope.geometry.attributes.position;
                for (var seg = 0; seg < 12; seg++) {
                    var segT = seg / 11;
                    var rx = ox - 0.3 + (lassoX - (ox - 0.3)) * segT;
                    var ry = oy + 0.15 + (lassoY + arcHeight - (oy + 0.15)) * segT;
                    // Rope sag
                    ry -= Math.sin(segT * Math.PI) * 0.05 * (1 - throwT);
                    positions.setXYZ(seg, rx, ry, 0);
                }
                positions.needsUpdate = true;
                this._rope.material.opacity = 0.5;

                // Rope particles along throw
                if (Math.random() < 0.3) {
                    this._emitRopeParticle(lassoX, lassoY + arcHeight);
                }

                model.rotation.z = -0.1 * (1 - throwT);
            } else if (attemptT < 0.80) {
                // Pulling target back
                var pullT = (attemptT - 0.55) / 0.25;
                var target2 = this._targets[currentAttempt];

                if (!target2.wrangled) {
                    target2.wrangled = true;
                }

                // Target gets dragged toward pile
                var dragX = target2.homeX + (this._pileX + currentAttempt * 0.08 - target2.homeX) * pullT;
                var dragY = target2.homeY + (this._pileY - target2.homeY) * pullT;
                target2.mesh.position.set(dragX, dragY, 0);

                // Lasso around target
                this._lasso.position.set(dragX, dragY, 0);
                this._lasso.scale.setScalar(1.3 - pullT * 0.3);

                // Rope from model to target
                this._rope.visible = true;
                var pos2 = this._rope.geometry.attributes.position;
                for (var sg2 = 0; sg2 < 12; sg2++) {
                    var sgT = sg2 / 11;
                    var rx2 = ox - 0.3 + (dragX - (ox - 0.3)) * sgT;
                    var ry2 = oy + 0.1 + (dragY - (oy + 0.1)) * sgT;
                    ry2 += Math.sin(sgT * Math.PI) * 0.03;
                    pos2.setXYZ(sg2, rx2, ry2, 0);
                }
                pos2.needsUpdate = true;

                // Model leans back pulling
                model.position.set(ox - 0.3 - pullT * 0.05, oy - pullT * 0.02, oz);
                model.rotation.z = pullT * 0.1;

                // Dust from dragging
                if (time - this._lastDust > 0.15) {
                    this._emitDust(dragX, dragY);
                    this._lastDust = time;
                }
            } else {
                // Reset for next throw
                var resetT = (attemptT - 0.80) / 0.20;
                this._lasso.position.set(
                    ox - 0.3 + Math.cos(this._lassoAngle) * 0.05,
                    oy + 0.22,
                    0
                );
                this._lasso.scale.setScalar(1);
                this._rope.visible = false;

                // Already wrangled targets stay in pile
                for (var wt = 0; wt <= currentAttempt; wt++) {
                    var wTarget = this._targets[wt];
                    if (wTarget.wrangled) {
                        wTarget.mesh.position.set(this._pileX + wt * 0.08, this._pileY, 0);
                        wTarget.mesh.scale.setScalar(1 + Math.sin(time * 2 + wt) * 0.05);
                    }
                }

                model.position.set(ox - 0.3, oy, oz);
                model.rotation.z = 0;
            }
        } else {
            // Phase 5: All wrangled, satisfaction fade
            var t5 = (progress - 0.82) / 0.18;

            // All targets in pile
            for (var tf = 0; tf < this._targets.length; tf++) {
                this._targets[tf].mesh.position.set(this._pileX + tf * 0.08, this._pileY, 0);
                this._targets[tf].mesh.material.opacity = 0.6 * (1 - t5);
            }

            this._lasso.material.opacity = 0.7 * (1 - t5);
            this._rope.visible = false;

            model.position.set(ox - 0.3 + t5 * 0.3, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update rope particles
        for (var ri = 0; ri < this._ropeParts.length; ri++) {
            var rp = this._ropeParts[ri];
            if (rp.life <= 0) continue;
            rp.life -= delta;
            if (rp.life <= 0) { rp.mesh.visible = false; continue; }
            rp.mesh.position.x += rp.vx * delta;
            rp.mesh.position.y += rp.vy * delta;
            rp.mesh.material.opacity = 0.5 * (rp.life / rp.maxLife);
        }

        // Update dust particles
        for (var di = 0; di < this._dustParts.length; di++) {
            var dp = this._dustParts[di];
            if (dp.life <= 0) continue;
            dp.life -= delta;
            if (dp.life <= 0) { dp.mesh.visible = false; continue; }
            dp.mesh.position.x += dp.vx * delta;
            dp.mesh.position.y += dp.vy * delta;
            dp.mesh.position.z += dp.vz * delta;
            dp.vy -= 0.5 * delta;
            var cs = dp.mesh.scale.x + dp.grow * delta;
            dp.mesh.scale.setScalar(cs);
            dp.mesh.material.opacity = 0.4 * (dp.life / dp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._lasso) { scene.remove(this._lasso); this._lasso.geometry.dispose(); this._lasso.material.dispose(); }
        if (this._rope) { scene.remove(this._rope); this._rope.geometry.dispose(); this._rope.material.dispose(); }
        if (this._targets) {
            this._targets.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); });
        }
        if (this._ropeParts) {
            this._ropeParts.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); });
        }
        if (this._dustParts) {
            this._dustParts.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); });
        }
        if (this._sunGlow) { scene.remove(this._sunGlow); this._sunGlow.geometry.dispose(); this._sunGlow.material.dispose(); }
        this._lasso = this._rope = this._targets = this._ropeParts = this._dustParts = this._sunGlow = null;
    }
};
