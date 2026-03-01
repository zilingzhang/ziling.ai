export default {
    name: 'Nebulizing',
    label: 'nebulizing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Mist particles - 50 varied translucent spheres
        this._mist = [];
        var mistGeo = new THREE.SphereGeometry(1, 8, 8);
        var nebulaColors = [0x8844cc, 0xaa44dd, 0x6633bb, 0xcc55ee, 0x5522aa,
                            0x7733cc, 0xbb66dd, 0x9944cc, 0x6644bb, 0xdd77ff];
        for (var i = 0; i < 50; i++) {
            var size = 0.03 + Math.random() * 0.05;
            var colorIdx = i % nebulaColors.length;
            var mMat = new THREE.MeshBasicMaterial({
                color: nebulaColors[colorIdx],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mist = new THREE.Mesh(mistGeo, mMat);
            mist.scale.setScalar(size);
            mist.visible = false;
            scene.add(mist);

            // Random emission angle from model center
            var angle = Math.random() * Math.PI * 2;
            var speed = 0.1 + Math.random() * 0.3;
            var emitDelay = Math.random() * 3.0;
            this._mist.push({
                mesh: mist,
                size: size,
                angle: angle,
                speed: speed,
                emitDelay: emitDelay,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed * 0.6,
                driftPhase: Math.random() * Math.PI * 2,
                driftSpeed: 0.5 + Math.random() * 1.5,
                maxDist: 0.5 + Math.random() * 1.0,
                currentDist: 0,
                baseOpacity: 0.15 + Math.random() * 0.25,
                colorShiftSpeed: 0.5 + Math.random() * 1.0,
                colorPhase: Math.random() * Math.PI * 2
            });
        }

        // Background stars
        this._stars = [];
        var starGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var j = 0; j < 15; j++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var star = new THREE.Mesh(starGeo, sMat);
            star.position.set(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 2,
                -0.5 - Math.random() * 0.5
            );
            star.visible = false;
            scene.add(star);
            this._stars.push({
                mesh: star,
                twinkleSpeed: 2 + Math.random() * 4,
                twinklePhase: Math.random() * Math.PI * 2,
                baseOp: 0.3 + Math.random() * 0.4
            });
        }

        // Central glow
        var glowGeo = new THREE.SphereGeometry(0.4, 16, 16);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x9955dd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.copy(this._origPos);
        scene.add(this._glow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;

        // Overall intensity envelope
        var intensity = 0;
        if (progress < 0.12) {
            intensity = progress / 0.12;
        } else if (progress < 0.75) {
            intensity = 1;
        } else if (progress < 0.92) {
            intensity = 1 - (progress - 0.75) / 0.17 * 0.3;
        } else {
            intensity = 0.7 * (1 - (progress - 0.92) / 0.08);
        }

        // Cloud expansion factor
        var cloudExpand = 0;
        if (progress < 0.12) {
            cloudExpand = progress / 0.12 * 0.3;
        } else if (progress < 0.45) {
            cloudExpand = 0.3 + (progress - 0.12) / 0.33 * 0.5;
        } else if (progress < 0.75) {
            cloudExpand = 0.8 + (progress - 0.45) / 0.30 * 0.2;
        } else {
            // Dispersal phase - cloud keeps expanding but thins
            cloudExpand = 1.0 + (progress - 0.75) / 0.25 * 0.8;
        }

        // Mist particles
        for (var i = 0; i < this._mist.length; i++) {
            var m = this._mist[i];
            var particleProgress = Math.max(0, (progress * 11 - m.emitDelay) / (11 - m.emitDelay));

            if (particleProgress <= 0) {
                m.mesh.visible = false;
                continue;
            }

            m.mesh.visible = true;

            // Position: emit from model center outward
            var dist = cloudExpand * m.maxDist * Math.min(1, particleProgress * 1.5);
            var drift = Math.sin(time * m.driftSpeed + m.driftPhase) * 0.05;
            var px = orig.x + m.dx * dist + drift;
            var py = orig.y + m.dy * dist + Math.sin(time * m.driftSpeed * 0.7 + m.driftPhase) * 0.03;
            m.mesh.position.set(px, py, -0.1 + Math.sin(m.driftPhase) * 0.1);

            // Opacity: fade in, maintain, then thin during dispersal
            var opacityMult = 1;
            if (particleProgress < 0.2) {
                opacityMult = particleProgress / 0.2;
            }
            if (progress > 0.75) {
                var disperseFade = (progress - 0.75) / 0.25;
                opacityMult *= (1 - disperseFade * 0.8);
            }
            m.mesh.material.opacity = m.baseOpacity * opacityMult * intensity;

            // Size: grow slightly as cloud expands
            var sizeScale = m.size * (1 + cloudExpand * 0.5);
            m.mesh.scale.setScalar(sizeScale);

            // Internal color variation - shift between nebula colors
            var colorT = Math.sin(time * m.colorShiftSpeed + m.colorPhase) * 0.5 + 0.5;
            var r = 0.5 + colorT * 0.3;
            var g = 0.2 + (1 - colorT) * 0.15;
            var b = 0.7 + colorT * 0.3;
            m.mesh.material.color.setRGB(r, g, b);
        }

        // Stars twinkle through mist
        for (var j = 0; j < this._stars.length; j++) {
            var s = this._stars[j];
            if (progress < 0.20) {
                s.mesh.visible = false;
            } else if (progress < 0.92) {
                s.mesh.visible = true;
                var twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.5 + 0.5;
                // Stars dim when cloud is thick, brighten as it disperses
                var mistThickness = progress < 0.75 ? 0.5 : 0.5 + (progress - 0.75) / 0.17 * 0.5;
                s.mesh.material.opacity = s.baseOp * twinkle * mistThickness * intensity;
                s.mesh.scale.setScalar(0.6 + twinkle * 0.6);
            } else {
                var starFade = (progress - 0.92) / 0.08;
                s.mesh.material.opacity *= (1 - starFade * 0.15);
                if (s.mesh.material.opacity < 0.01) s.mesh.visible = false;
            }
        }

        // Central glow
        var glowInt = 0;
        if (progress < 0.12) {
            glowInt = progress / 0.12 * 0.1;
        } else if (progress < 0.45) {
            glowInt = 0.1 + (progress - 0.12) / 0.33 * 0.1;
        } else if (progress < 0.75) {
            glowInt = 0.2 + Math.sin(time * 1.5) * 0.04;
        } else {
            glowInt = 0.2 * (1 - (progress - 0.75) / 0.25);
        }
        this._glow.material.opacity = glowInt;
        this._glow.scale.setScalar(1 + cloudExpand * 0.5 + Math.sin(time * 1.2) * 0.1);
        this._glow.position.set(orig.x, orig.y, -0.2);

        // Color shift for glow over time
        var glowHue = Math.sin(time * 0.4) * 0.5 + 0.5;
        this._glow.material.color.setRGB(0.5 + glowHue * 0.2, 0.2 + (1 - glowHue) * 0.1, 0.7 + glowHue * 0.2);

        // Model gentle float
        var floatAmt = intensity * 0.03;
        model.position.set(
            orig.x + Math.sin(time * 0.7) * 0.01 * intensity,
            orig.y + Math.sin(time * 0.9) * floatAmt,
            0
        );

        // Settle at end
        if (progress >= 0.92) {
            var settle = (progress - 0.92) / 0.08;
            model.position.set(
                orig.x * (1 - settle) + orig.x * settle,
                orig.y + Math.sin(time * 0.9) * floatAmt * (1 - settle),
                0
            );
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._mist) {
            this._mist.forEach(function(m) {
                scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose();
            });
        }
        if (this._stars) {
            this._stars.forEach(function(s) {
                scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
            });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._mist = this._stars = this._glow = null;
    }
};
