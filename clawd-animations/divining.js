export default {
    name: 'Divining',
    label: 'divining',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x, oy = this._origPos.y;

        // Crystal ball sphere (translucent, glass-like)
        var ballGeo = new THREE.SphereGeometry(0.18, 24, 24);
        var ballMat = new THREE.MeshBasicMaterial({
            color: 0x8899cc, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._ball = new THREE.Mesh(ballGeo, ballMat);
        this._ball.position.set(ox + 0.35, oy - 0.05, 0);
        this._ball.scale.set(0, 0, 0);
        scene.add(this._ball);

        // Crystal ball outer glow
        var ballGlowGeo = new THREE.SphereGeometry(0.22, 16, 16);
        var ballGlowMat = new THREE.MeshBasicMaterial({
            color: 0x6677bb, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._ballGlow = new THREE.Mesh(ballGlowGeo, ballGlowMat);
        this._ballGlow.position.set(ox + 0.35, oy - 0.05, 0);
        this._ballGlow.scale.set(0, 0, 0);
        scene.add(this._ballGlow);

        // 15 internal mist particles (confined to sphere radius)
        this._mist = [];
        var mistGeo = new THREE.SphereGeometry(0.025, 4, 4);
        for (var i = 0; i < 15; i++) {
            var mMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x9999dd : (i % 3 === 1 ? 0xbb88cc : 0x7799ee),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mist = new THREE.Mesh(mistGeo, mMat);
            mist.visible = false;
            scene.add(mist);
            this._mist.push({
                mesh: mist,
                angle: Math.random() * Math.PI * 2,
                elevation: Math.random() * Math.PI,
                speed: 0.8 + Math.random() * 1.0,
                radius: 0.04 + Math.random() * 0.1,
                phase: Math.random() * Math.PI * 2
            });
        }

        // 6 vision beam cylinders (projecting outward from ball)
        this._visionBeams = [];
        var beamGeo = new THREE.CylinderGeometry(0.01, 0.003, 0.6, 4);
        for (var j = 0; j < 6; j++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xaa88ff : 0x88aaff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var beam = new THREE.Mesh(beamGeo, bMat);
            beam.visible = false;
            scene.add(beam);
            this._visionBeams.push({
                mesh: beam,
                angle: (j / 6) * Math.PI * 2,
                elevation: -0.3 + (j % 3) * 0.3
            });
        }

        // Revelation flash ring
        var flashGeo = new THREE.TorusGeometry(0.25, 0.07, 8, 24);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._flash = new THREE.Mesh(flashGeo, flashMat);
        this._flash.position.set(ox + 0.35, oy - 0.05, 0);
        this._flash.scale.set(0, 0, 0);
        scene.add(this._flash);

        // Mystical aura (purple/blue ambient glow around ball)
        var auraGeo = new THREE.SphereGeometry(0.35, 12, 12);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0x6644aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.set(ox + 0.35, oy - 0.05, 0);
        scene.add(this._aura);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x, oy = this._origPos.y, oz = this._origPos.z;
        var ballX = ox + 0.35, ballY = oy - 0.05;

        if (progress < 0.10) {
            // Phase 1: Crystal ball materializes
            var t = progress / 0.10;
            var ease = 1 - Math.pow(1 - t, 3);

            this._ball.scale.setScalar(ease);
            this._ball.material.opacity = ease * 0.35;

            this._ballGlow.scale.setScalar(ease);
            this._ballGlow.material.opacity = ease * 0.1;

            this._aura.material.opacity = ease * 0.05;
        } else if (progress < 0.30) {
            // Phase 2: Internal mist swirls
            var t2 = (progress - 0.10) / 0.20;

            this._ball.material.opacity = 0.35;
            this._ballGlow.material.opacity = 0.1 + Math.sin(time * 3) * 0.03;

            // Mist particles swirl inside ball
            for (var i = 0; i < this._mist.length; i++) {
                var m = this._mist[i];
                var mistT = Math.min(t2 * 3 - i / 15, 1);
                m.mesh.visible = mistT > 0;
                if (mistT > 0) {
                    var a = m.angle + time * m.speed;
                    var el = m.elevation + time * m.speed * 0.5;
                    var r = m.radius * Math.min(mistT, 1);
                    // Keep particles confined within sphere radius (0.15)
                    m.mesh.position.set(
                        ballX + Math.cos(a) * Math.sin(el) * r,
                        ballY + Math.cos(el) * r,
                        Math.sin(a) * Math.sin(el) * r * 0.5
                    );
                    m.mesh.material.opacity = Math.min(mistT, 0.5);
                    m.mesh.scale.setScalar(0.5 + Math.sin(time * 2 + m.phase) * 0.2);
                }
            }

            this._aura.material.opacity = 0.05 + t2 * 0.03;
        } else if (progress < 0.55) {
            // Phase 3: Model leans toward ball, colors pulse
            var t3 = (progress - 0.30) / 0.25;

            // Model leans toward ball
            model.position.set(ox + t3 * 0.1, oy, oz);
            model.rotation.z = -t3 * 0.06;

            // Ball glows with color pulses
            var pulse = Math.sin(time * 4);
            var pulseColor = pulse > 0 ? 0x9988dd : 0x88aaff;
            this._ball.material.color.setHex(pulseColor);
            this._ball.material.opacity = 0.35 + Math.abs(pulse) * 0.15;
            this._ballGlow.material.opacity = 0.1 + Math.abs(pulse) * 0.08;
            this._ballGlow.scale.setScalar(1.0 + Math.abs(pulse) * 0.1);

            // Mist swirls faster
            for (var i2 = 0; i2 < this._mist.length; i2++) {
                var m2 = this._mist[i2];
                m2.mesh.visible = true;
                var a2 = m2.angle + time * m2.speed * 1.5;
                var el2 = m2.elevation + time * m2.speed * 0.8;
                var r2 = m2.radius;
                m2.mesh.position.set(
                    ballX + Math.cos(a2) * Math.sin(el2) * r2,
                    ballY + Math.cos(el2) * r2,
                    Math.sin(a2) * Math.sin(el2) * r2 * 0.5
                );
                m2.mesh.material.opacity = 0.5 + Math.sin(time * 3 + i2) * 0.15;
                // Color shift
                var hue = (time * 0.1 + i2 * 0.1) % 1.0;
                var c = new THREE.Color();
                c.setHSL(hue * 0.3 + 0.6, 0.6, 0.6);
                m2.mesh.material.color.copy(c);
            }

            this._aura.material.opacity = 0.08 + t3 * 0.04 + Math.sin(time * 2) * 0.02;
        } else if (progress < 0.72) {
            // Phase 4: Vision beams project outward
            var t4 = (progress - 0.55) / 0.17;

            model.position.set(ox + 0.1, oy, oz);
            model.rotation.z = -0.06;

            // Ball intensifies
            this._ball.material.opacity = 0.5 + Math.sin(time * 6) * 0.1;
            this._ball.material.color.setHex(0xaabbee);
            this._ballGlow.material.opacity = 0.18 + Math.sin(time * 4) * 0.06;

            // Vision beams project
            for (var j = 0; j < this._visionBeams.length; j++) {
                var vb = this._visionBeams[j];
                var beamT = Math.min(t4 * 2, 1);
                vb.mesh.visible = beamT > 0;
                vb.mesh.material.opacity = beamT * 0.5;
                var bAngle = vb.angle + time * 0.5;
                var bLen = beamT * 0.6;
                vb.mesh.scale.y = beamT;
                vb.mesh.position.set(
                    ballX + Math.cos(bAngle) * (0.2 + bLen * 0.5),
                    ballY + vb.elevation * beamT + Math.sin(bAngle) * 0.1,
                    Math.sin(bAngle) * 0.2
                );
                vb.mesh.rotation.z = bAngle - Math.PI / 2;
            }

            // Mist continues
            for (var i3 = 0; i3 < this._mist.length; i3++) {
                var m3 = this._mist[i3];
                var a3 = m3.angle + time * m3.speed * 2.0;
                var el3 = m3.elevation + time * m3.speed;
                m3.mesh.position.set(
                    ballX + Math.cos(a3) * Math.sin(el3) * m3.radius,
                    ballY + Math.cos(el3) * m3.radius,
                    Math.sin(a3) * Math.sin(el3) * m3.radius * 0.5
                );
                m3.mesh.material.opacity = 0.6;
            }

            this._aura.material.opacity = 0.12 + t4 * 0.05;
        } else if (progress < 0.85) {
            // Phase 5: Bright revelation flash
            var t5 = (progress - 0.72) / 0.13;

            model.position.set(ox + 0.1, oy, oz);

            // Flash ring
            if (t5 < 0.4) {
                var flashT = t5 / 0.4;
                this._flash.scale.setScalar(flashT * 3.0);
                this._flash.material.opacity = (1 - flashT * 0.5) * 0.8;
                this._flash.rotation.z = time * 3;
            } else {
                var flashFade = (t5 - 0.4) / 0.6;
                this._flash.scale.setScalar(3.0 + flashFade * 1.0);
                this._flash.material.opacity = 0.4 * (1 - flashFade);
            }

            // Ball bright
            this._ball.material.opacity = 0.6 + (1 - t5) * 0.2;
            this._ball.material.color.setHex(0xddeeff);
            this._ballGlow.material.opacity = 0.3 * (1 - t5 * 0.5);

            // Beams fade
            for (var j2 = 0; j2 < this._visionBeams.length; j2++) {
                this._visionBeams[j2].mesh.material.opacity = 0.5 * (1 - t5);
            }

            // Aura pulses bright
            this._aura.material.opacity = 0.15 + (1 - t5) * 0.1;
            this._aura.material.color.setHex(0x8866cc);
        } else {
            // Phase 6: Ball dims, settle
            var t6 = (progress - 0.85) / 0.15;

            model.position.set(ox + 0.1 * (1 - t6), oy, oz);
            model.rotation.z = -0.06 * (1 - t6);

            this._ball.material.opacity = 0.35 * (1 - t6);
            this._ball.scale.setScalar(1.0 - t6 * 0.3);
            this._ballGlow.material.opacity = 0.1 * (1 - t6);
            this._ballGlow.scale.setScalar(1.0 - t6 * 0.3);

            this._flash.material.opacity = 0;

            for (var i4 = 0; i4 < this._mist.length; i4++) {
                this._mist[i4].mesh.material.opacity = 0.5 * (1 - t6);
            }
            for (var j3 = 0; j3 < this._visionBeams.length; j3++) {
                this._visionBeams[j3].mesh.visible = false;
            }

            this._aura.material.opacity = 0.05 * (1 - t6);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._ball) { scene.remove(this._ball); this._ball.geometry.dispose(); this._ball.material.dispose(); }
        if (this._ballGlow) { scene.remove(this._ballGlow); this._ballGlow.geometry.dispose(); this._ballGlow.material.dispose(); }
        if (this._mist) { this._mist.forEach(function(m) { scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); }); }
        if (this._visionBeams) { this._visionBeams.forEach(function(v) { scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh.material.dispose(); }); }
        if (this._flash) { scene.remove(this._flash); this._flash.geometry.dispose(); this._flash.material.dispose(); }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        this._ball = this._ballGlow = this._mist = this._visionBeams = this._flash = this._aura = null;
    }
};
