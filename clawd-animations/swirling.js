export default {
    name: 'Swirling',
    label: 'swirling',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Debris particles - spiral upward in widening helix
        this._debris = [];
        var debGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
        for (var d = 0; d < 30; d++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: d % 3 === 0 ? 0x887766 : (d % 3 === 1 ? 0x998877 : 0x776655),
                transparent: true, opacity: 0
            });
            var deb = new THREE.Mesh(debGeo, dMat);
            deb.visible = false;
            scene.add(deb);
            this._debris.push({
                mesh: deb,
                angle: (d / 30) * Math.PI * 2,
                height: 0,
                baseRadius: 0.15 + (d / 30) * 0.4,
                speed: 2 + Math.random() * 2,
                vertSpeed: 0.3 + Math.random() * 0.4,
                phase: Math.random() * Math.PI * 2,
                active: false,
                size: 0.5 + Math.random() * 0.8
            });
        }

        // Wind line meshes - thin cylinders rotating around center
        this._windLines = [];
        for (var w = 0; w < 8; w++) {
            var wGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.3 + Math.random() * 0.2, 4);
            var wMat = new THREE.MeshBasicMaterial({
                color: w % 2 === 0 ? 0xaabb99 : 0x99aa88,
                transparent: true, opacity: 0
            });
            var wind = new THREE.Mesh(wGeo, wMat);
            wind.visible = false;
            scene.add(wind);
            this._windLines.push({
                mesh: wind,
                angle: (w / 8) * Math.PI * 2,
                height: Math.random() * 1.5,
                radius: 0.3 + Math.random() * 0.3,
                speed: 3 + Math.random() * 2,
                active: false
            });
        }

        // Dust base ring torus at ground
        var dustGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 24);
        var dustMat = new THREE.MeshBasicMaterial({
            color: 0x998866, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._dustRing = new THREE.Mesh(dustGeo, dustMat);
        this._dustRing.rotation.x = Math.PI / 2;
        this._dustRing.position.set(this._origPos.x, this._origPos.y - 0.5, 0);
        scene.add(this._dustRing);

        // Funnel glow - additive sphere stretched vertically
        var funnelGeo = new THREE.CylinderGeometry(0.1, 0.4, 1.5, 12, 1, true);
        var funnelMat = new THREE.MeshBasicMaterial({
            color: 0x887766, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._funnel = new THREE.Mesh(funnelGeo, funnelMat);
        this._funnel.position.set(this._origPos.x, this._origPos.y + 0.2, -0.1);
        scene.add(this._funnel);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var intensity = 0;
        var tightness = 1; // 1 = normal, < 1 = tighter spiral

        // Phase: Wind starts, small rotation (0-10%)
        if (progress < 0.10) {
            intensity = progress / 0.10;
        }
        // Phase: Funnel builds, particles spiral up (10-35%)
        else if (progress < 0.35) {
            intensity = 0.3 + 0.5 * ((progress - 0.10) / 0.25);
        }
        // Phase: Full tornado, model lifted and spinning (35-65%)
        else if (progress < 0.65) {
            intensity = 1.0;
        }
        // Phase: Peak intensity, tightest spiral (65-78%)
        else if (progress < 0.78) {
            intensity = 1.0;
            tightness = 0.6;
        }
        // Phase: Winds die down, particles disperse (78-92%)
        else if (progress < 0.92) {
            var windDown = (progress - 0.78) / 0.14;
            intensity = 1.0 - windDown * 0.9;
            tightness = 0.6 + windDown * 0.8; // wider as it dissipates
        }
        // Phase: Calm (92-100%)
        else {
            var calm = (progress - 0.92) / 0.08;
            intensity = 0.1 * (1 - calm);
        }

        // Funnel visibility and rotation
        this._funnel.material.opacity = intensity * 0.08;
        this._funnel.rotation.y = time * 2;
        this._funnel.scale.x = tightness;
        this._funnel.scale.z = tightness;

        // Dust ring at base
        this._dustRing.material.opacity = intensity * 0.3;
        this._dustRing.rotation.z = time * 3;
        this._dustRing.scale.setScalar(tightness * 0.8 + 0.4 + Math.sin(time * 2) * 0.1 * intensity);

        // Activate and update debris particles
        var debrisToShow = Math.floor(intensity * 30);
        for (var di = 0; di < this._debris.length; di++) {
            var d = this._debris[di];
            if (di < debrisToShow) {
                if (!d.active) {
                    d.active = true;
                    d.mesh.visible = true;
                    d.height = 0;
                    d.angle = (di / 30) * Math.PI * 2 + Math.random();
                }

                // Helical upward path
                d.angle += d.speed * delta * intensity;
                d.height += d.vertSpeed * delta * intensity;

                // Wrap height
                if (d.height > 2.0) {
                    d.height = 0;
                    d.angle = Math.random() * Math.PI * 2;
                }

                // Radius varies with height (funnel shape) and tightness
                var heightFactor = d.height / 2.0;
                var radius = (d.baseRadius * tightness) * (0.3 + heightFactor * 0.7);

                // During dispersion, radius increases
                if (progress >= 0.78 && progress < 0.92) {
                    var disperseAmount = (progress - 0.78) / 0.14;
                    radius += disperseAmount * 0.5;
                }

                d.mesh.position.set(
                    orig.x + Math.cos(d.angle) * radius,
                    orig.y - 0.5 + d.height,
                    Math.sin(d.angle) * radius * 0.3
                );

                d.mesh.rotation.x = time * d.speed;
                d.mesh.rotation.z = time * d.speed * 0.7;
                d.mesh.material.opacity = intensity * 0.6 * (1 - heightFactor * 0.3);
                d.mesh.scale.setScalar(d.size * (1 - heightFactor * 0.3));
            } else {
                if (d.active) {
                    d.active = false;
                    d.mesh.visible = false;
                }
            }
        }

        // Wind lines rotate around the vortex
        var windToShow = Math.floor(intensity * 8);
        for (var wi = 0; wi < this._windLines.length; wi++) {
            var w = this._windLines[wi];
            if (wi < windToShow) {
                if (!w.active) {
                    w.active = true;
                    w.mesh.visible = true;
                }
                w.angle += w.speed * delta * intensity;
                var wRadius = w.radius * tightness;
                w.mesh.position.set(
                    orig.x + Math.cos(w.angle) * wRadius,
                    orig.y - 0.3 + w.height * intensity,
                    Math.sin(w.angle) * wRadius * 0.3
                );
                // Orient wind line tangent to rotation
                w.mesh.rotation.z = w.angle + Math.PI / 2;
                w.mesh.rotation.x = Math.PI / 2 * 0.3;
                w.mesh.material.opacity = intensity * 0.3;
            } else {
                if (w.active) {
                    w.active = false;
                    w.mesh.visible = false;
                }
            }
        }

        // Model lift and spin
        var liftAmount = 0;
        var spinAmount = 0;
        if (progress >= 0.35 && progress < 0.78) {
            var liftProg = progress < 0.50 ? (progress - 0.35) / 0.15 : 1.0;
            liftAmount = liftProg * 0.4;
            spinAmount = intensity;
        } else if (progress >= 0.78 && progress < 0.92) {
            var landProg = (progress - 0.78) / 0.14;
            liftAmount = 0.4 * (1 - landProg);
            spinAmount = intensity * (1 - landProg);
        }

        model.position.set(
            orig.x + Math.sin(time * 1.5) * 0.03 * intensity,
            orig.y + liftAmount,
            0
        );
        model.rotation.z = time * 2 * spinAmount;

        // Scale wobble in the vortex
        var wobble = 1 + Math.sin(time * 6) * 0.03 * intensity;
        model.scale.setScalar(this._origScale.x * wobble);

        // Settle at the very end
        if (progress >= 0.92) {
            var settle = (progress - 0.92) / 0.08;
            model.position.set(
                orig.x + Math.sin(time * 1.5) * 0.03 * intensity * (1 - settle),
                orig.y,
                0
            );
            model.rotation.z = model.rotation.z * (1 - settle);
            model.scale.copy(this._origScale);
            if (settle > 0.9) {
                model.position.copy(orig);
                model.rotation.z = 0;
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._debris) { this._debris.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        if (this._windLines) { this._windLines.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }); }
        if (this._dustRing) { scene.remove(this._dustRing); this._dustRing.geometry.dispose(); this._dustRing.material.dispose(); }
        if (this._funnel) { scene.remove(this._funnel); this._funnel.geometry.dispose(); this._funnel.material.dispose(); }
        this._debris = this._windLines = this._dustRing = this._funnel = null;
    }
};
