export default {
    name: 'Incubating',
    label: 'incubating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Nest ring (brown line segments arranged in circle)
        this._nestSegments = [];
        for (var n = 0; n < 16; n++) {
            var nAngle = (n / 16) * Math.PI * 2;
            var nGeo = new THREE.BoxGeometry(0.08, 0.012, 0.01);
            var nMat = new THREE.MeshBasicMaterial({
                color: n % 2 === 0 ? 0x886644 : 0x775533,
                transparent: true, opacity: 0
            });
            var seg = new THREE.Mesh(nGeo, nMat);
            seg.position.set(
                ox + Math.cos(nAngle) * 0.2,
                oy - 0.3 + Math.sin(nAngle) * 0.06,
                0
            );
            seg.rotation.z = nAngle + Math.PI / 2;
            scene.add(seg);
            this._nestSegments.push({ mesh: seg });
        }

        // Egg (sphere) in center
        var eggGeo = new THREE.SphereGeometry(0.08, 10, 10);
        var eggMat = new THREE.MeshBasicMaterial({
            color: 0xeeddcc, transparent: true, opacity: 0
        });
        this._egg = new THREE.Mesh(eggGeo, eggMat);
        this._egg.position.set(ox, oy - 0.28, 0);
        this._egg.scale.set(0.9, 1.15, 0.9);
        scene.add(this._egg);

        // Warmth aura (outer glow)
        var auraGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0xffaa55, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._warmthAura = new THREE.Mesh(auraGeo, auraMat);
        this._warmthAura.position.set(ox, oy - 0.25, 0);
        scene.add(this._warmthAura);

        // Temperature circulation particles
        this._heatParticles = [];
        var heatGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var h = 0; h < 20; h++) {
            var hMat = new THREE.MeshBasicMaterial({
                color: h % 3 === 0 ? 0xffbb66 : (h % 3 === 1 ? 0xff9944 : 0xffcc88),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var heat = new THREE.Mesh(heatGeo, hMat);
            heat.visible = false;
            scene.add(heat);
            this._heatParticles.push({
                mesh: heat,
                angle: (h / 20) * Math.PI * 2,
                radius: 0.12 + Math.random() * 0.1,
                speed: 0.5 + Math.random() * 0.8,
                vertOscillation: Math.random() * 0.03,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Inner egg glow (development indicator)
        var innerGeo = new THREE.SphereGeometry(0.05, 8, 8);
        var innerMat = new THREE.MeshBasicMaterial({
            color: 0xffeeaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._innerGlow = new THREE.Mesh(innerGeo, innerMat);
        this._innerGlow.position.set(ox, oy - 0.28, 0);
        scene.add(this._innerGlow);

        // Patience pulse ring
        var pulseGeo = new THREE.RingGeometry(0.22, 0.24, 20);
        var pulseMat = new THREE.MeshBasicMaterial({
            color: 0xffcc77, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
        this._pulseRing.position.set(ox, oy - 0.25, 0);
        scene.add(this._pulseRing);

        this._devPhase = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        this._devPhase += delta * 0.5;
        var warmth = 0;

        // Phase 1: Nest appears (0-10%)
        if (progress < 0.10) {
            var t = progress / 0.10;
            for (var n = 0; n < this._nestSegments.length; n++) {
                this._nestSegments[n].mesh.material.opacity = t * 0.6;
            }
            this._egg.material.opacity = t * 0.8;
            model.position.set(ox, oy + 0.1, oz);
        }
        // Phase 2: Model settles protectively (10-22%)
        else if (progress < 0.22) {
            var t2 = (progress - 0.10) / 0.12;
            for (var n2 = 0; n2 < this._nestSegments.length; n2++) {
                this._nestSegments[n2].mesh.material.opacity = 0.6;
            }
            this._egg.material.opacity = 0.8;

            // Model hovers down protectively
            var hoverY = oy + 0.1 - t2 * 0.15;
            model.position.set(ox, hoverY, oz);
            // Slight scale compress to suggest settling
            model.scale.copy(this._origScale).multiplyScalar(1 - t2 * 0.05);

            warmth = t2 * 0.3;
        }
        // Phase 3: Warmth builds, heat circulates (22-50%)
        else if (progress < 0.50) {
            var t3 = (progress - 0.22) / 0.28;
            warmth = 0.3 + t3 * 0.5;

            // Model hovers protectively
            model.position.set(ox, oy - 0.05 + Math.sin(time * 0.8) * 0.01, oz);
            model.scale.copy(this._origScale).multiplyScalar(0.95);

            // Inner glow starts
            this._innerGlow.material.opacity = t3 * 0.15;
        }
        // Phase 4: Development visible (50-75%)
        else if (progress < 0.75) {
            var t4 = (progress - 0.50) / 0.25;
            warmth = 0.8 + t4 * 0.2;

            model.position.set(ox, oy - 0.05 + Math.sin(time * 0.8) * 0.01, oz);
            model.scale.copy(this._origScale).multiplyScalar(0.95);

            // Inner glow changes color through development stages
            var devR = 1.0;
            var devG = 0.9 - t4 * 0.3;
            var devB = 0.7 - t4 * 0.4;
            this._innerGlow.material.color.setRGB(devR, devG, devB);
            this._innerGlow.material.opacity = 0.15 + t4 * 0.15 + Math.sin(time * 2) * 0.05;
            this._innerGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.1);
        }
        // Phase 5: Final warmth, patience glow (75-88%)
        else if (progress < 0.88) {
            var t5 = (progress - 0.75) / 0.13;
            warmth = 1.0;

            model.position.set(ox, oy - 0.05 + Math.sin(time * 0.8) * 0.01, oz);
            model.scale.copy(this._origScale).multiplyScalar(0.95);

            // Pulse ring
            var pulseCycle = (time * 1.5) % 2;
            this._pulseRing.scale.setScalar(1 + pulseCycle * 0.3);
            this._pulseRing.material.opacity = Math.max(0, (1 - pulseCycle / 2)) * 0.2 * warmth;

            this._innerGlow.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
        }
        // Phase 6: Fade out (88-100%)
        else {
            var t6 = (progress - 0.88) / 0.12;
            warmth = 1.0 * (1 - t6);

            for (var n3 = 0; n3 < this._nestSegments.length; n3++) {
                this._nestSegments[n3].mesh.material.opacity = 0.6 * (1 - t6);
            }
            this._egg.material.opacity = 0.8 * (1 - t6);
            this._innerGlow.material.opacity = 0.3 * (1 - t6);
            this._pulseRing.material.opacity = 0;

            model.position.set(ox, oy - 0.05 * (1 - t6), oz);
            model.scale.copy(this._origScale).multiplyScalar(0.95 + t6 * 0.05);

            if (t6 > 0.8) {
                model.position.copy(this._origPos);
                model.scale.copy(this._origScale);
            }
        }

        // Warmth aura
        this._warmthAura.material.opacity = warmth * 0.12 * (1 + Math.sin(time * 1.5) * 0.3);
        this._warmthAura.scale.setScalar(1 + Math.sin(time * 1.2) * 0.08);

        // Heat particles circulate
        for (var h = 0; h < this._heatParticles.length; h++) {
            var hp = this._heatParticles[h];
            if (warmth < 0.1) { hp.mesh.visible = false; continue; }
            hp.mesh.visible = true;
            hp.angle += hp.speed * delta;
            var hx = ox + Math.cos(hp.angle) * hp.radius;
            var hy = oy - 0.25 + Math.sin(hp.angle) * hp.radius * 0.4 + Math.sin(time + hp.phase) * hp.vertOscillation;
            hp.mesh.position.set(hx, hy, 0);
            hp.mesh.material.opacity = warmth * 0.35 * (0.5 + Math.sin(hp.angle + hp.phase) * 0.5);
            hp.mesh.scale.setScalar(0.7 + warmth * 0.3);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._nestSegments) { this._nestSegments.forEach(function(n) { scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose(); }); }
        if (this._egg) { scene.remove(this._egg); this._egg.geometry.dispose(); this._egg.material.dispose(); }
        if (this._warmthAura) { scene.remove(this._warmthAura); this._warmthAura.geometry.dispose(); this._warmthAura.material.dispose(); }
        if (this._heatParticles) { this._heatParticles.forEach(function(h) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); }); }
        if (this._innerGlow) { scene.remove(this._innerGlow); this._innerGlow.geometry.dispose(); this._innerGlow.material.dispose(); }
        if (this._pulseRing) { scene.remove(this._pulseRing); this._pulseRing.geometry.dispose(); this._pulseRing.material.dispose(); }
        this._nestSegments = this._egg = this._warmthAura = this._heatParticles = this._innerGlow = this._pulseRing = null;
    }
};