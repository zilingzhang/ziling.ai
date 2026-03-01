export default {
    name: 'Hyperspacing',
    label: 'hyperspacing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Star streak meshes (start as small spheres, stretch into long cylinders)
        this._stars = [];
        var starGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.04, 4);
        for (var i = 0; i < 40; i++) {
            var colorChoice = i % 4;
            var color = colorChoice === 0 ? 0xffffff : (colorChoice === 1 ? 0xaaccff : (colorChoice === 2 ? 0x88bbff : 0xccddff));
            var sMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var star = new THREE.Mesh(starGeo, sMat);
            // Distribute stars in a cylinder around the view axis
            var angle = Math.random() * Math.PI * 2;
            var radius = 0.3 + Math.random() * 1.5;
            var depth = -1 + Math.random() * 2;
            star.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                depth
            );
            star.rotation.x = Math.PI / 2; // Align cylinder along Z
            star.visible = false;
            scene.add(star);
            this._stars.push({
                mesh: star,
                angle: angle,
                radius: radius,
                baseDepth: depth,
                speed: 0.5 + Math.random() * 1.5,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Hyperspace tunnel glow (large cylinder, viewed from inside)
        var tunnelGeo = new THREE.CylinderGeometry(1.8, 1.8, 4, 24, 1, true);
        var tunnelMat = new THREE.MeshBasicMaterial({
            color: 0x2244aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
        this._tunnel.rotation.x = Math.PI / 2; // Align along Z
        this._tunnel.position.set(this._origPos.x, this._origPos.y, 0);
        this._tunnel.visible = false;
        scene.add(this._tunnel);

        // Inner tunnel ring glow
        var innerGeo = new THREE.TorusGeometry(0.8, 0.15, 8, 32);
        var innerMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._innerRing = new THREE.Mesh(innerGeo, innerMat);
        this._innerRing.position.set(this._origPos.x, this._origPos.y, 0.5);
        this._innerRing.visible = false;
        scene.add(this._innerRing);

        // Flash sphere for exit
        var flashGeo = new THREE.SphereGeometry(0.5, 16, 16);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._flash = new THREE.Mesh(flashGeo, flashMat);
        this._flash.position.set(this._origPos.x, this._origPos.y, 0);
        this._flash.visible = false;
        scene.add(this._flash);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var oz = orig.z;
        var streakLength = 0;
        var tunnelOpacity = 0;
        var modelStretch = 1;

        if (progress < 0.08) {
            // Phase 1: Stars appear as dots
            var p = progress / 0.08;
            for (var i = 0; i < this._stars.length; i++) {
                var s = this._stars[i];
                s.mesh.visible = true;
                s.mesh.material.opacity = p * 0.6;
                s.mesh.scale.set(1, 1, 1);
            }
            model.position.copy(orig);
            model.scale.copy(this._origScale);

        } else if (progress < 0.20) {
            // Phase 2: Stars begin stretching, tunnel forms
            var p2 = (progress - 0.08) / 0.12;
            streakLength = p2 * 15;
            tunnelOpacity = p2 * 0.08;
            modelStretch = 1 + p2 * 0.3;

            this._tunnel.visible = true;
            this._innerRing.visible = true;

            model.scale.set(
                this._origScale.x * (1 - p2 * 0.1),
                this._origScale.y,
                this._origScale.z * modelStretch
            );

        } else if (progress < 0.55) {
            // Phase 3: Full hyperspace, max streaks
            var p3 = (progress - 0.20) / 0.35;
            streakLength = 15 + p3 * 25;
            tunnelOpacity = 0.08 + p3 * 0.06;
            modelStretch = 1.3 + Math.sin(time * 4) * 0.1;

            model.scale.set(
                this._origScale.x * 0.9,
                this._origScale.y,
                this._origScale.z * modelStretch
            );
            // Slight vibration during hyperspace
            model.position.set(
                orig.x + Math.sin(time * 15) * 0.01,
                orig.y + Math.cos(time * 12) * 0.008,
                oz
            );

        } else if (progress < 0.70) {
            // Phase 4: Star streaks intensify, tunnel bright
            var p4 = (progress - 0.55) / 0.15;
            streakLength = 40 + p4 * 20;
            tunnelOpacity = 0.14 + p4 * 0.08;
            modelStretch = 1.3 + p4 * 0.3;

            model.scale.set(
                this._origScale.x * (0.9 - p4 * 0.1),
                this._origScale.y,
                this._origScale.z * modelStretch
            );
            model.position.set(
                orig.x + Math.sin(time * 20) * 0.015,
                orig.y + Math.cos(time * 17) * 0.012,
                oz
            );

            // Exit flash begins
            if (p4 > 0.8) {
                this._flash.visible = true;
                var flashP = (p4 - 0.8) / 0.2;
                this._flash.material.opacity = flashP * 0.4;
                this._flash.scale.setScalar(flashP * 2);
            }

        } else if (progress < 0.85) {
            // Phase 5: Deceleration, streaks shorten
            var p5 = (progress - 0.70) / 0.15;
            streakLength = 60 * (1 - p5 * p5);
            tunnelOpacity = 0.22 * (1 - p5);
            modelStretch = 1.6 * (1 - p5) + p5;

            model.scale.set(
                this._origScale.x * (0.8 + p5 * 0.2),
                this._origScale.y,
                this._origScale.z * modelStretch
            );
            model.position.set(
                orig.x + Math.sin(time * 15) * 0.01 * (1 - p5),
                orig.y + Math.cos(time * 12) * 0.008 * (1 - p5),
                oz
            );

            // Flash peaks then fades
            this._flash.visible = true;
            if (p5 < 0.2) {
                this._flash.material.opacity = 0.4 + p5 * 2;
                this._flash.scale.setScalar(2 + p5 * 5);
            } else {
                this._flash.material.opacity = 0.8 * (1 - (p5 - 0.2) / 0.8);
                this._flash.scale.setScalar(3 + p5 * 2);
            }

        } else {
            // Phase 6: Normal space, settle
            var p6 = (progress - 0.85) / 0.15;
            streakLength = 0;
            tunnelOpacity = 0;

            model.position.set(orig.x, orig.y, oz);
            model.scale.copy(this._origScale);

            this._tunnel.visible = false;
            this._innerRing.visible = false;
            this._flash.visible = p6 < 0.3;
            if (p6 < 0.3) {
                this._flash.material.opacity = 0.2 * (1 - p6 / 0.3);
            }

            // Stars fade out
            for (var f = 0; f < this._stars.length; f++) {
                this._stars[f].mesh.material.opacity = (1 - p6) * 0.4;
                this._stars[f].mesh.scale.set(1, 1, 1);
            }
        }

        // Update stars - streak effect
        if (progress >= 0.08 && progress < 0.85) {
            for (var j = 0; j < this._stars.length; j++) {
                var st = this._stars[j];
                st.mesh.visible = true;

                // Stars move toward viewer (positive Z)
                var zPos = st.baseDepth + (time * st.speed * 0.5 + st.phase) % 4 - 2;
                st.mesh.position.set(
                    Math.cos(st.angle) * st.radius,
                    Math.sin(st.angle) * st.radius,
                    zPos
                );

                // Stretch along Z based on streakLength
                var stretch = 1 + streakLength * st.speed * 0.3;
                st.mesh.scale.set(1, stretch, 1);

                // Brightness varies with speed
                var brightness = 0.3 + st.speed * 0.3;
                st.mesh.material.opacity = Math.min(1, brightness);
            }
        }

        // Update tunnel
        if (this._tunnel.visible) {
            this._tunnel.material.opacity = tunnelOpacity;
            this._tunnel.rotation.z = time * 0.3;
        }

        // Update inner ring
        if (this._innerRing.visible) {
            this._innerRing.material.opacity = tunnelOpacity * 2;
            this._innerRing.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._stars) {
            this._stars.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._tunnel) { scene.remove(this._tunnel); this._tunnel.geometry.dispose(); this._tunnel.material.dispose(); }
        if (this._innerRing) { scene.remove(this._innerRing); this._innerRing.geometry.dispose(); this._innerRing.material.dispose(); }
        if (this._flash) { scene.remove(this._flash); this._flash.geometry.dispose(); this._flash.material.dispose(); }
        this._stars = this._tunnel = this._innerRing = this._flash = null;
    }
};
