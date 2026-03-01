export default {
    name: 'Catapulting',
    label: 'catapulting',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Trebuchet base (horizontal box)
        var baseGeo = new THREE.BoxGeometry(0.8, 0.06, 0.15);
        var baseMat = new THREE.MeshBasicMaterial({
            color: 0x664422, transparent: true, opacity: 0
        });
        this._base = new THREE.Mesh(baseGeo, baseMat);
        this._base.position.set(this._origPos.x - 0.6, this._origPos.y - 0.4, 0);
        scene.add(this._base);

        // Trebuchet pivot (small sphere)
        var pivotGeo = new THREE.SphereGeometry(0.04, 8, 8);
        var pivotMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0
        });
        this._pivot = new THREE.Mesh(pivotGeo, pivotMat);
        this._pivot.position.set(this._origPos.x - 0.6, this._origPos.y - 0.2, 0);
        scene.add(this._pivot);

        // Trebuchet arm (thin long box, rotates around pivot)
        var armGeo = new THREE.BoxGeometry(0.9, 0.035, 0.04);
        var armMat = new THREE.MeshBasicMaterial({
            color: 0x886644, transparent: true, opacity: 0
        });
        this._arm = new THREE.Mesh(armGeo, armMat);
        this._arm.position.set(this._origPos.x - 0.6, this._origPos.y - 0.2, 0);
        scene.add(this._arm);

        // Counterweight (small box at short end)
        var cwGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        var cwMat = new THREE.MeshBasicMaterial({
            color: 0x555555, transparent: true, opacity: 0
        });
        this._counterweight = new THREE.Mesh(cwGeo, cwMat);
        scene.add(this._counterweight);

        // Tension energy glow
        var tensionGeo = new THREE.SphereGeometry(0.15, 12, 12);
        var tensionMat = new THREE.MeshBasicMaterial({
            color: 0xff6600, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._tensionGlow = new THREE.Mesh(tensionGeo, tensionMat);
        scene.add(this._tensionGlow);

        // Trail particles (during flight)
        this._trail = [];
        var trailGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var i = 0; i < 20; i++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xff8833 : (i % 3 === 1 ? 0xffaa55 : 0xffcc77),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tm = new THREE.Mesh(trailGeo, tMat);
            tm.visible = false;
            scene.add(tm);
            this._trail.push({
                mesh: tm,
                life: 0,
                maxLife: 0.4 + Math.random() * 0.3,
                vx: 0, vy: 0,
                active: false
            });
        }

        // Dust impact particles
        this._dust = [];
        var dustGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var d = 0; d < 15; d++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: d % 2 === 0 ? 0xccaa88 : 0xddbb99,
                transparent: true, opacity: 0
            });
            var dm = new THREE.Mesh(dustGeo, dMat);
            dm.visible = false;
            scene.add(dm);
            this._dust.push({
                mesh: dm,
                life: 0,
                maxLife: 0.6 + Math.random() * 0.4,
                vx: (Math.random() - 0.5) * 1.5,
                vy: Math.random() * 1.0 + 0.3,
                active: false
            });
        }

        // Impact ring
        var ringGeo = new THREE.TorusGeometry(0.3, 0.02, 8, 32);
        var ringMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._impactRing = new THREE.Mesh(ringGeo, ringMat);
        this._impactRing.rotation.x = Math.PI / 2;
        this._impactRing.visible = false;
        scene.add(this._impactRing);

        // Flight tracking
        this._trailIdx = 0;
        this._dustTriggered = false;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var pivotX = orig.x - 0.6;
        var pivotY = orig.y - 0.2;

        // Trebuchet arm angle calculation
        var armAngle = 0.4; // Initial loaded angle (tilted back)
        var trebOpacity = 0;

        if (progress < 0.12) {
            // Phase 1: Trebuchet appears, arm loads
            var p = progress / 0.12;
            trebOpacity = p;
            armAngle = 0.4;
            model.position.set(pivotX + Math.cos(armAngle) * 0.35, pivotY + Math.sin(armAngle) * 0.35, orig.z);
            model.scale.copy(this._origScale);

        } else if (progress < 0.25) {
            // Phase 2: Tension winds, energy glow builds
            var p2 = (progress - 0.12) / 0.13;
            trebOpacity = 1;
            armAngle = 0.4 + p2 * 0.3; // Wind back more
            model.position.set(pivotX + Math.cos(armAngle) * 0.35, pivotY + Math.sin(armAngle) * 0.35, orig.z);

            // Tension glow grows
            this._tensionGlow.visible = true;
            this._tensionGlow.position.set(model.position.x, model.position.y, 0);
            this._tensionGlow.material.opacity = p2 * 0.6;
            this._tensionGlow.scale.setScalar(0.5 + p2 * 1.0 + Math.sin(time * 8) * 0.1);

            // Model shakes with tension
            model.position.x += Math.sin(time * 20) * 0.005 * p2;
            model.position.y += Math.cos(time * 18) * 0.003 * p2;

        } else if (progress < 0.50) {
            // Phase 3: LAUNCH! Parabolic flight
            var p3 = (progress - 0.25) / 0.25;
            trebOpacity = 1 - p3 * 0.5;

            // Arm swings forward rapidly
            armAngle = 0.7 - p3 * 2.5;

            // Parabolic arc: model flies from left to right
            var startX = pivotX + 0.35;
            var endX = orig.x + 1.0;
            var arcX = startX + (endX - startX) * p3;
            var arcHeight = 1.2;
            var arcY = orig.y + arcHeight * 4 * p3 * (1 - p3); // parabola
            model.position.set(arcX, arcY, orig.z);
            model.rotation.z = -p3 * Math.PI * 1.5; // Spinning during flight

            // Tension glow fades on launch
            this._tensionGlow.material.opacity = (1 - p3) * 0.3;
            this._tensionGlow.position.set(model.position.x, model.position.y, 0);

            // Spawn trail particles
            if (delta > 0) {
                var ti = this._trailIdx % this._trail.length;
                var tp = this._trail[ti];
                tp.mesh.visible = true;
                tp.mesh.position.set(model.position.x, model.position.y, 0);
                tp.life = tp.maxLife;
                tp.vx = (Math.random() - 0.5) * 0.3;
                tp.vy = -Math.random() * 0.3;
                tp.active = true;
                this._trailIdx++;
            }

        } else if (progress < 0.60) {
            // Phase 4: Peak arc with trail continuing
            var p4 = (progress - 0.50) / 0.10;
            trebOpacity = 0.5 - p4 * 0.3;

            var startX2 = orig.x + 1.0;
            var endX2 = orig.x + 0.3;
            var arcX2 = startX2 + (endX2 - startX2) * p4;
            var arcY2 = orig.y + 0.8 * (1 - p4 * p4); // Descending
            model.position.set(arcX2, arcY2, orig.z);
            model.rotation.z = -Math.PI * 1.5 - p4 * Math.PI * 0.5;

            this._tensionGlow.visible = false;

        } else if (progress < 0.75) {
            // Phase 5: Landing impact, dust burst
            var p5 = (progress - 0.60) / 0.15;
            trebOpacity = 0.2 * (1 - p5);

            if (p5 < 0.15) {
                // Quick final descent
                var landP = p5 / 0.15;
                model.position.set(orig.x + 0.3 * (1 - landP), orig.y + 0.2 * (1 - landP), orig.z);
                model.rotation.z = -Math.PI * 2 * (1 - landP);
            } else {
                model.position.set(orig.x, orig.y, orig.z);
                model.rotation.z = 0;
                // Bounce squash
                var squash = Math.sin((p5 - 0.15) / 0.85 * Math.PI) * 0.15;
                model.scale.set(
                    this._origScale.x * (1 + squash),
                    this._origScale.y * (1 - squash * 0.8),
                    this._origScale.z
                );
            }

            // Trigger dust burst
            if (!this._dustTriggered) {
                this._dustTriggered = true;
                for (var d = 0; d < this._dust.length; d++) {
                    this._dust[d].active = true;
                    this._dust[d].life = this._dust[d].maxLife;
                    this._dust[d].mesh.visible = true;
                    this._dust[d].mesh.position.set(orig.x, orig.y - 0.1, 0);
                }
                // Impact ring
                this._impactRing.visible = true;
                this._impactRing.position.set(orig.x, orig.y - 0.1, 0);
                this._impactRing.scale.set(0.3, 0.3, 0.3);
                this._impactRing.material.opacity = 0.8;
            }

            // Expand impact ring
            var ringP = p5;
            this._impactRing.scale.setScalar(0.3 + ringP * 2.0);
            this._impactRing.material.opacity = 0.8 * (1 - ringP);

        } else if (progress < 0.90) {
            // Phase 6: Bounce return / settle
            var p6 = (progress - 0.75) / 0.15;
            trebOpacity = 0;
            model.position.set(orig.x, orig.y + Math.sin(p6 * Math.PI * 2) * 0.05 * (1 - p6), orig.z);
            model.rotation.z = 0;

            var bounceScale = Math.sin(p6 * Math.PI * 3) * 0.05 * (1 - p6);
            model.scale.set(
                this._origScale.x * (1 + bounceScale),
                this._origScale.y * (1 - bounceScale * 0.5),
                this._origScale.z
            );

            this._impactRing.visible = false;

        } else {
            // Phase 7: Final settle
            var p7 = (progress - 0.90) / 0.10;
            trebOpacity = 0;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update trebuchet arm visualization
        this._base.material.opacity = trebOpacity * 0.7;
        this._pivot.material.opacity = trebOpacity * 0.8;
        this._arm.material.opacity = trebOpacity * 0.7;
        this._arm.rotation.z = armAngle;

        // Counterweight position (opposite end of arm from model)
        var cwX = pivotX - Math.cos(armAngle) * 0.3;
        var cwY = pivotY - Math.sin(armAngle) * 0.3;
        this._counterweight.position.set(cwX, cwY, 0);
        this._counterweight.material.opacity = trebOpacity * 0.6;

        // Update trail particles
        for (var t = 0; t < this._trail.length; t++) {
            var tp = this._trail[t];
            if (tp.active && tp.life > 0) {
                tp.life -= delta;
                tp.mesh.position.x += tp.vx * delta;
                tp.mesh.position.y += tp.vy * delta;
                tp.vy -= 0.5 * delta; // gravity
                var lifeRatio = Math.max(0, tp.life / tp.maxLife);
                tp.mesh.material.opacity = lifeRatio * 0.6;
                tp.mesh.scale.setScalar(0.5 + lifeRatio * 0.5);
                if (tp.life <= 0) {
                    tp.active = false;
                    tp.mesh.visible = false;
                }
            }
        }

        // Update dust particles
        for (var dd = 0; dd < this._dust.length; dd++) {
            var dp = this._dust[dd];
            if (dp.active && dp.life > 0) {
                dp.life -= delta;
                dp.mesh.position.x += dp.vx * delta;
                dp.mesh.position.y += dp.vy * delta;
                dp.vy -= 1.5 * delta; // gravity pulls dust down
                var dustRatio = Math.max(0, dp.life / dp.maxLife);
                dp.mesh.material.opacity = dustRatio * 0.5;
                dp.mesh.scale.setScalar(0.3 + (1 - dustRatio) * 0.7);
                if (dp.life <= 0) {
                    dp.active = false;
                    dp.mesh.visible = false;
                }
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._base) { scene.remove(this._base); this._base.geometry.dispose(); this._base.material.dispose(); }
        if (this._pivot) { scene.remove(this._pivot); this._pivot.geometry.dispose(); this._pivot.material.dispose(); }
        if (this._arm) { scene.remove(this._arm); this._arm.geometry.dispose(); this._arm.material.dispose(); }
        if (this._counterweight) { scene.remove(this._counterweight); this._counterweight.geometry.dispose(); this._counterweight.material.dispose(); }
        if (this._tensionGlow) { scene.remove(this._tensionGlow); this._tensionGlow.geometry.dispose(); this._tensionGlow.material.dispose(); }
        if (this._trail) {
            this._trail.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); });
        }
        if (this._dust) {
            this._dust.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); });
        }
        if (this._impactRing) { scene.remove(this._impactRing); this._impactRing.geometry.dispose(); this._impactRing.material.dispose(); }
        this._base = this._pivot = this._arm = this._counterweight = this._tensionGlow = null;
        this._trail = this._dust = this._impactRing = null;
    }
};
