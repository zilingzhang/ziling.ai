export default {
    name: 'Contemplating',
    label: 'contemplating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Calm aura sphere (soft blue/white, additive)
        var auraGeo = new THREE.SphereGeometry(0.4, 16, 16);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0x88bbff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.set(ox, oy, -0.05);
        scene.add(this._aura);

        // 6 ripple ring tori - expand from base like water
        this._ripples = [];
        for (var i = 0; i < 6; i++) {
            var ripGeo = new THREE.TorusGeometry(0.04, 0.008, 6, 32);
            var ripMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x88ccff : 0xaaddff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ripple = new THREE.Mesh(ripGeo, ripMat);
            ripple.position.set(ox, oy - 0.2, 0);
            ripple.rotation.x = Math.PI * 0.5;
            ripple.visible = false;
            scene.add(ripple);
            this._ripples.push({
                mesh: ripple,
                active: false,
                startTime: 0,
                baseRadius: 0.04,
                expandRate: 0.4 + i * 0.08,
                idx: i
            });
        }
        this._lastRipple = 0;
        this._rippleIdx = 0;

        // 5 orbiting thought orbs - small, calm colors
        this._orbs = [];
        var orbGeo = new THREE.SphereGeometry(0.03, 8, 8);
        var orbColors = [0x88bbff, 0xaaccee, 0x99ddff, 0xbbccff, 0xddeeff];
        for (var j = 0; j < 5; j++) {
            var orbMat = new THREE.MeshBasicMaterial({
                color: orbColors[j],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var orb = new THREE.Mesh(orbGeo, orbMat);
            orb.visible = false;
            scene.add(orb);
            this._orbs.push({
                mesh: orb,
                angle: (j / 5) * Math.PI * 2,
                radius: 0.25 + (j % 3) * 0.06,
                speed: 0.6 + j * 0.12,
                yOffset: (j % 2 === 0 ? 0.03 : -0.02),
                bobPhase: Math.random() * Math.PI * 2
            });
        }

        // Inner glow (warm white core)
        var innerGeo = new THREE.SphereGeometry(0.15, 12, 12);
        var innerMat = new THREE.MeshBasicMaterial({
            color: 0xeeeeff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._innerGlow = new THREE.Mesh(innerGeo, innerMat);
        this._innerGlow.position.set(ox, oy, 0.02);
        scene.add(this._innerGlow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.12) {
            // Phase 1: Model rises slowly to meditation pose
            var t = progress / 0.12;
            var ease = t * t * (3 - 2 * t); // smoothstep
            model.position.set(ox, oy + ease * 0.08, oz);
            model.rotation.z = 0;

            // Inner glow starts faintly
            this._innerGlow.material.opacity = ease * 0.05;
        } else if (progress < 0.30) {
            // Phase 2: Aura begins, first ripples
            var t2 = (progress - 0.12) / 0.18;
            model.position.set(ox, oy + 0.08, oz);

            // Aura fades in
            this._aura.material.opacity = t2 * 0.1;
            this._aura.scale.setScalar(0.8 + t2 * 0.2);

            this._innerGlow.material.opacity = 0.05 + t2 * 0.05;

            // Spawn first ripples
            if (time - this._lastRipple > 0.8) {
                var rip = this._ripples[this._rippleIdx % this._ripples.length];
                this._rippleIdx++;
                rip.active = true;
                rip.mesh.visible = true;
                rip.startTime = time;
                this._lastRipple = time;
            }

            // Gentle breathing bob
            model.position.y = oy + 0.08 + Math.sin(time * 0.8) * 0.003;
        } else if (progress < 0.55) {
            // Phase 3: Deep contemplation, orbiting orbs appear
            var t3 = (progress - 0.30) / 0.25;
            model.position.set(ox, oy + 0.08 + Math.sin(time * 0.8) * 0.005, oz);

            this._aura.material.opacity = 0.1 + Math.sin(time * 1.2) * 0.03;
            this._aura.scale.setScalar(1.0 + Math.sin(time * 0.7) * 0.08);

            this._innerGlow.material.opacity = 0.1 + Math.sin(time * 1.5) * 0.03;

            // Orbs appear one by one
            for (var oi = 0; oi < 5; oi++) {
                if (t3 > oi * 0.18) {
                    var orb = this._orbs[oi];
                    orb.mesh.visible = true;
                    var orbFade = Math.min(1, (t3 - oi * 0.18) / 0.15);
                    orb.mesh.material.opacity = orbFade * 0.5;
                    var a = orb.angle + time * orb.speed;
                    orb.mesh.position.set(
                        ox + Math.cos(a) * orb.radius,
                        oy + 0.08 + Math.sin(a) * orb.radius * 0.4 + orb.yOffset + Math.sin(time * 0.6 + orb.bobPhase) * 0.01,
                        0.05
                    );
                }
            }

            // Continue ripples
            if (time - this._lastRipple > 1.0) {
                var rip2 = this._ripples[this._rippleIdx % this._ripples.length];
                this._rippleIdx++;
                rip2.active = true;
                rip2.mesh.visible = true;
                rip2.startTime = time;
                this._lastRipple = time;
            }
        } else if (progress < 0.75) {
            // Phase 4: Peak serenity, all orbs in harmonious orbit
            var t4 = (progress - 0.55) / 0.20;
            model.position.set(ox, oy + 0.08 + Math.sin(time * 0.8) * 0.005, oz);

            var peakAura = 0.12 + Math.sin(t4 * Math.PI) * 0.06;
            this._aura.material.opacity = peakAura + Math.sin(time * 1.2) * 0.02;
            this._aura.scale.setScalar(1.0 + Math.sin(time * 0.7) * 0.1);

            this._innerGlow.material.opacity = 0.12 + Math.sin(time * 1.5) * 0.04;
            this._innerGlow.scale.setScalar(1 + Math.sin(time * 1) * 0.1);

            // All orbs orbit harmoniously
            for (var oj = 0; oj < 5; oj++) {
                var orb2 = this._orbs[oj];
                orb2.mesh.visible = true;
                orb2.mesh.material.opacity = 0.5 + Math.sin(time * 0.8 + oj) * 0.1;
                var a2 = orb2.angle + time * orb2.speed;
                orb2.mesh.position.set(
                    ox + Math.cos(a2) * orb2.radius,
                    oy + 0.08 + Math.sin(a2) * orb2.radius * 0.4 + orb2.yOffset + Math.sin(time * 0.6 + orb2.bobPhase) * 0.015,
                    0.05
                );
                orb2.mesh.scale.setScalar(1 + Math.sin(time * 1.2 + oj * 0.7) * 0.15);
            }

            // Slow ripples
            if (time - this._lastRipple > 1.5) {
                var rip3 = this._ripples[this._rippleIdx % this._ripples.length];
                this._rippleIdx++;
                rip3.active = true;
                rip3.mesh.visible = true;
                rip3.startTime = time;
                this._lastRipple = time;
            }
        } else if (progress < 0.88) {
            // Phase 5: Gradual descent
            var t5 = (progress - 0.75) / 0.13;
            var descend = t5 * t5;
            model.position.set(ox, oy + 0.08 * (1 - descend), oz);

            this._aura.material.opacity = 0.12 * (1 - t5 * 0.6);
            this._innerGlow.material.opacity = 0.1 * (1 - t5 * 0.5);

            // Orbs slow and fade
            for (var ok = 0; ok < 5; ok++) {
                var orb3 = this._orbs[ok];
                orb3.mesh.material.opacity = 0.5 * (1 - t5 * 0.7);
                var a3 = orb3.angle + time * orb3.speed * (1 - t5 * 0.5);
                orb3.mesh.position.set(
                    ox + Math.cos(a3) * orb3.radius * (1 - t5 * 0.3),
                    oy + 0.08 * (1 - descend) + Math.sin(a3) * orb3.radius * 0.3,
                    0.05
                );
            }
        } else {
            // Phase 6: Grounded, calm
            var t6 = (progress - 0.88) / 0.12;
            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._aura.material.opacity = 0.05 * (1 - t6);
            this._innerGlow.material.opacity = 0.05 * (1 - t6);

            for (var ol = 0; ol < 5; ol++) {
                this._orbs[ol].mesh.material.opacity *= (1 - t6 * 0.08);
                if (this._orbs[ol].mesh.material.opacity < 0.01) this._orbs[ol].mesh.visible = false;
            }
        }

        // Update ripple rings
        for (var ri = 0; ri < this._ripples.length; ri++) {
            var rr = this._ripples[ri];
            if (!rr.active) continue;
            var elapsed = time - rr.startTime;
            var ripDuration = 2.5;
            var ripT = elapsed / ripDuration;
            if (ripT > 1) {
                rr.active = false;
                rr.mesh.visible = false;
                continue;
            }
            rr.mesh.scale.setScalar((rr.baseRadius + ripT * rr.expandRate * 8) / rr.baseRadius);
            rr.mesh.material.opacity = (1 - ripT) * 0.35;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        if (this._innerGlow) { scene.remove(this._innerGlow); this._innerGlow.geometry.dispose(); this._innerGlow.material.dispose(); }
        if (this._ripples) {
            this._ripples.forEach(function(r) {
                scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose();
            });
        }
        if (this._orbs) {
            this._orbs.forEach(function(o) {
                scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose();
            });
        }
        this._aura = this._innerGlow = this._ripples = this._orbs = null;
    }
};
