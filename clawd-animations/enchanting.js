export default {
    name: 'Enchanting',
    label: 'enchanting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x, oy = this._origPos.y;

        // 5 ascending torus rings
        this._rings = [];
        var ringColors = [0xff4488, 0xff8844, 0xffcc22, 0x44ff88, 0x4488ff];
        for (var i = 0; i < 5; i++) {
            var rGeo = new THREE.TorusGeometry(0.25 + i * 0.03, 0.02, 12, 32);
            var rMat = new THREE.MeshBasicMaterial({
                color: ringColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var ring = new THREE.Mesh(rGeo, rMat);
            ring.position.set(ox, oy - 0.4, 0);
            ring.rotation.x = Math.PI / 2;
            ring.scale.set(0, 0, 0);
            scene.add(ring);
            this._rings.push({
                mesh: ring,
                baseY: oy - 0.4,
                targetY: oy + 0.6,
                speed: 1.0 + i * 0.3,
                colorIdx: i
            });
        }

        // 25 sparkle particles spiraling upward
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.018, 4, 4);
        for (var j = 0; j < 25; j++) {
            var spkMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, spkMat);
            spk.visible = false;
            scene.add(spk);
            this._sparkles.push({
                mesh: spk,
                angle: (j / 25) * Math.PI * 2,
                radius: 0.15 + Math.random() * 0.2,
                yOffset: Math.random() * 1.2,
                speed: 0.8 + Math.random() * 1.2,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Final aura sphere
        var auraGeo = new THREE.SphereGeometry(0.5, 16, 16);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.set(ox, oy, 0);
        this._aura.scale.set(0, 0, 0);
        scene.add(this._aura);
    },
    _rainbowColor(t, THREE) {
        var hue = (t % 1.0);
        var c = new THREE.Color();
        c.setHSL(hue, 1.0, 0.6);
        return c;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x, oy = this._origPos.y;

        if (progress < 0.10) {
            // Phase 1: First ring appears at base
            var t = progress / 0.10;
            var ease = 1 - Math.pow(1 - t, 3);
            var r0 = this._rings[0];
            r0.mesh.scale.setScalar(ease);
            r0.mesh.material.opacity = ease * 0.7;
            r0.mesh.rotation.z = time * r0.speed;
        } else if (progress < 0.45) {
            // Phase 2: Rings rise sequentially, sparkles trail
            var t2 = (progress - 0.10) / 0.35;

            for (var i = 0; i < this._rings.length; i++) {
                var r = this._rings[i];
                var ringStart = i * 0.18;
                var ringT = Math.max(0, Math.min((t2 - ringStart) / 0.4, 1));
                var ringEase = 1 - Math.pow(1 - ringT, 2);

                r.mesh.scale.setScalar(ringT > 0 ? 1.0 : 0);
                r.mesh.material.opacity = ringT * 0.7;
                r.mesh.position.y = r.baseY + (r.targetY - r.baseY) * ringEase * t2;
                r.mesh.rotation.z = time * r.speed;
            }

            // Sparkles appear
            for (var j = 0; j < this._sparkles.length; j++) {
                var sp = this._sparkles[j];
                var spStart = j / 25 * 0.5;
                var spT = Math.max(0, (t2 - spStart));
                sp.mesh.visible = spT > 0;
                if (spT > 0) {
                    var a = sp.angle + time * sp.speed;
                    var yProg = (spT * 0.8 + sp.yOffset) % 1.2;
                    sp.mesh.position.set(
                        ox + Math.cos(a) * sp.radius,
                        oy - 0.4 + yProg,
                        Math.sin(a) * sp.radius * 0.5
                    );
                    sp.mesh.material.opacity = Math.min(spT * 3, 0.7);
                    sp.mesh.material.color.copy(this._rainbowColor(time * 0.2 + j * 0.04, THREE));
                }
            }

            // Model glow effect (scale pulse)
            model.scale.setScalar(this._origScale.x * (1 + t2 * 0.05));
        } else if (progress < 0.70) {
            // Phase 3: All rings active, rainbow color cycle
            var t3 = (progress - 0.45) / 0.25;

            for (var i2 = 0; i2 < this._rings.length; i2++) {
                var r2 = this._rings[i2];
                r2.mesh.material.opacity = 0.7 + Math.sin(time * 4 + i2) * 0.2;
                var spread = r2.baseY + (r2.targetY - r2.baseY) * (0.3 + i2 * 0.15);
                r2.mesh.position.y = spread + Math.sin(time * 2 + i2 * 0.5) * 0.05;
                r2.mesh.rotation.z = time * r2.speed * 1.3;
                // Rainbow cycle
                r2.mesh.material.color.copy(this._rainbowColor(time * 0.3 + i2 * 0.2, THREE));
            }

            // All sparkles active, spiraling
            for (var j2 = 0; j2 < this._sparkles.length; j2++) {
                var sp2 = this._sparkles[j2];
                sp2.mesh.visible = true;
                var a2 = sp2.angle + time * sp2.speed * 1.5;
                var yProg2 = ((time * 0.5 + sp2.yOffset) % 1.2);
                sp2.mesh.position.set(
                    ox + Math.cos(a2) * sp2.radius,
                    oy - 0.4 + yProg2,
                    Math.sin(a2) * sp2.radius * 0.5
                );
                sp2.mesh.material.opacity = 0.6 + Math.sin(time * 3 + j2) * 0.2;
                sp2.mesh.material.color.copy(this._rainbowColor(time * 0.4 + j2 * 0.04, THREE));
            }

            model.scale.setScalar(this._origScale.x * (1.05 + Math.sin(time * 3) * 0.03));
        } else if (progress < 0.85) {
            // Phase 4: Rings converge at top, bright flash
            var t4 = (progress - 0.70) / 0.15;
            var convergeY = oy + 0.3;

            for (var i3 = 0; i3 < this._rings.length; i3++) {
                var r3 = this._rings[i3];
                var curY = r3.mesh.position.y;
                r3.mesh.position.y = curY + (convergeY - curY) * t4 * 0.1;
                r3.mesh.rotation.z = time * r3.speed * 2.0;
                r3.mesh.scale.setScalar(1.0 - t4 * 0.5);
                r3.mesh.material.opacity = 0.7 * (1 - t4 * 0.5);
                r3.mesh.material.color.copy(this._rainbowColor(time * 0.5 + i3 * 0.2, THREE));
            }

            // Sparkles converge
            for (var j3 = 0; j3 < this._sparkles.length; j3++) {
                var sp3 = this._sparkles[j3];
                sp3.mesh.material.opacity = 0.8 * (1 - t4 * 0.5);
            }

            // Aura pulse
            if (t4 > 0.5) {
                var auraT = (t4 - 0.5) / 0.5;
                this._aura.scale.setScalar(auraT * 2.0);
                this._aura.material.opacity = (1 - auraT) * 0.6;
            }

            model.scale.setScalar(this._origScale.x * (1.08 - t4 * 0.08));
        } else {
            // Phase 5: Aura pulse, settle
            var t5 = (progress - 0.85) / 0.15;

            this._aura.scale.setScalar(2.0 + t5 * 1.0);
            this._aura.material.opacity = 0.6 * (1 - t5);

            for (var i4 = 0; i4 < this._rings.length; i4++) {
                this._rings[i4].mesh.material.opacity = 0.35 * (1 - t5);
                this._rings[i4].mesh.scale.setScalar(0.5 * (1 - t5));
            }

            for (var j4 = 0; j4 < this._sparkles.length; j4++) {
                this._sparkles[j4].mesh.material.opacity = 0.4 * (1 - t5);
            }

            model.position.copy(this._origPos);
            model.scale.copy(this._origScale);
            model.rotation.z = 0;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._rings) { this._rings.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        this._rings = this._sparkles = this._aura = null;
    }
};
