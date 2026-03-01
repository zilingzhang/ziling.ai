export default {
    name: 'Boogieing',
    label: 'boogieing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Disco ball (icosahedron for faceted look)
        var ballGeo = new THREE.IcosahedronGeometry(0.08, 1);
        var ballMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._discoBall = new THREE.Mesh(ballGeo, ballMat);
        this._discoBall.position.set(this._origPos.x, this._origPos.y + 0.8, 0);
        scene.add(this._discoBall);

        // Disco ball inner glow
        var glowGeo = new THREE.SphereGeometry(0.1, 8, 8);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffffcc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._discoGlow = new THREE.Mesh(glowGeo, glowMat);
        this._discoGlow.position.copy(this._discoBall.position);
        scene.add(this._discoGlow);

        // Light beams (thin cylinders radiating from disco ball)
        this._beams = [];
        var beamGeo = new THREE.CylinderGeometry(0.005, 0.015, 0.6, 4);
        var beamColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0xaa44ff];
        for (var i = 0; i < 8; i++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: beamColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var beam = new THREE.Mesh(beamGeo, bMat);
            beam.visible = false;
            scene.add(beam);
            this._beams.push({
                mesh: beam,
                baseAngle: (i / 8) * Math.PI * 2,
                speed: 0.8 + Math.random() * 0.6
            });
        }

        // Floor light discs
        this._floorLights = [];
        var floorGeo = new THREE.CircleGeometry(0.1, 12);
        var floorColors = [0xff2266, 0x22ff66, 0x2266ff, 0xffff22, 0xff22ff, 0x22ffff];
        for (var j = 0; j < 6; j++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: floorColors[j], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var floorLight = new THREE.Mesh(floorGeo, fMat);
            floorLight.rotation.x = -Math.PI / 2;
            var angle = (j / 6) * Math.PI * 2;
            floorLight.position.set(
                this._origPos.x + Math.cos(angle) * 0.4,
                this._origPos.y - 0.2,
                Math.sin(angle) * 0.3
            );
            floorLight.visible = false;
            scene.add(floorLight);
            this._floorLights.push({ mesh: floorLight, phase: j * Math.PI / 3 });
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ballY = orig.y + 0.8;

        // BPM for disco beat
        var bpm = 120;
        var beat = (time * bpm / 60) % 1.0;
        var onBeat = beat < 0.2;

        if (progress < 0.10) {
            // Disco ball descends
            var t = progress / 0.10;
            var descendY = ballY + 0.5 * (1 - t);
            this._discoBall.position.y = descendY;
            this._discoGlow.position.y = descendY;
            this._discoBall.material.opacity = t * 0.8;
            this._discoGlow.material.opacity = t * 0.3;
            this._discoBall.rotation.y = time * 2;
        } else if (progress < 0.30) {
            // Lights start, model starts bouncing
            var t2 = (progress - 0.10) / 0.20;
            this._discoBall.position.y = ballY;
            this._discoGlow.position.y = ballY;
            this._discoBall.material.opacity = 0.8;
            this._discoGlow.material.opacity = 0.3 + Math.sin(time * 4) * 0.1;
            this._discoBall.rotation.y = time * 3;

            // Beams fade in
            for (var bi = 0; bi < this._beams.length; bi++) {
                var b = this._beams[bi];
                b.mesh.visible = true;
                var bAngle = b.baseAngle + time * b.speed;
                b.mesh.position.set(
                    orig.x + Math.cos(bAngle) * 0.15,
                    ballY - 0.3,
                    Math.sin(bAngle) * 0.15
                );
                b.mesh.rotation.z = bAngle + Math.PI / 4;
                b.mesh.rotation.x = 0.3;
                b.mesh.material.opacity = t2 * 0.4;
            }

            // Floor lights fade in
            for (var fi = 0; fi < this._floorLights.length; fi++) {
                this._floorLights[fi].mesh.visible = true;
                this._floorLights[fi].mesh.material.opacity = t2 * 0.3;
            }

            // Model starts gentle bounce
            var bounce = Math.abs(Math.sin(time * 4)) * 0.05 * t2;
            model.position.set(orig.x, orig.y + bounce, orig.z);
        } else if (progress < 0.75) {
            // Full boogie!
            var t3 = (progress - 0.30) / 0.45;
            this._discoBall.rotation.y = time * 4;
            this._discoBall.material.opacity = 0.8 + Math.sin(time * 6) * 0.15;
            this._discoGlow.material.opacity = 0.3 + Math.sin(time * 8) * 0.15;

            // Rhythmic model bounce with lateral sway
            var bounceH = Math.abs(Math.sin(time * bpm / 60 * Math.PI)) * 0.12;
            var sway = Math.sin(time * 2) * 0.15;
            model.position.set(orig.x + sway, orig.y + bounceH, orig.z);

            // Squash/stretch on beat
            if (onBeat) {
                model.scale.set(gs * 1.08, gs * 0.90, gs);
            } else {
                model.scale.set(gs * (1 - bounceH * 0.2), gs * (1 + bounceH * 0.3), gs);
            }

            model.rotation.z = sway * 0.2;

            // Animate beams
            for (var bi2 = 0; bi2 < this._beams.length; bi2++) {
                var b2 = this._beams[bi2];
                var bAngle2 = b2.baseAngle + time * b2.speed;
                b2.mesh.position.set(
                    orig.x + Math.cos(bAngle2) * 0.15,
                    ballY - 0.3,
                    Math.sin(bAngle2) * 0.15
                );
                b2.mesh.rotation.z = bAngle2 + Math.PI / 4;
                b2.mesh.rotation.x = 0.4 + Math.sin(time * 2 + bi2) * 0.2;
                b2.mesh.material.opacity = 0.3 + (onBeat ? 0.4 : 0);
                // Color cycling
                var hue = ((time * 0.5 + bi2 * 0.125) % 1.0);
                b2.mesh.material.color.setHSL(hue, 1.0, 0.5);
            }

            // Floor lights pulse
            for (var fi2 = 0; fi2 < this._floorLights.length; fi2++) {
                var fl = this._floorLights[fi2];
                var flPulse = Math.sin(time * bpm / 60 * Math.PI + fl.phase);
                fl.mesh.material.opacity = 0.2 + Math.max(0, flPulse) * 0.5;
                fl.mesh.scale.setScalar(0.8 + Math.max(0, flPulse) * 0.4);
                var flHue = ((time * 0.3 + fi2 * 0.167) % 1.0);
                fl.mesh.material.color.setHSL(flHue, 1.0, 0.5);
            }
        } else if (progress < 0.85) {
            // Peak energy spin
            var t4 = (progress - 0.75) / 0.10;
            var spinAngle = t4 * Math.PI * 6;
            var spinBounce = Math.abs(Math.sin(time * 8)) * 0.15;

            model.position.set(orig.x, orig.y + spinBounce, orig.z);
            model.rotation.z = spinAngle;
            model.scale.setScalar(gs * (1 + Math.sin(t4 * Math.PI) * 0.08));

            this._discoBall.rotation.y = time * 6;
            this._discoBall.material.opacity = 1.0;
            this._discoGlow.material.opacity = 0.5;

            for (var bi3 = 0; bi3 < this._beams.length; bi3++) {
                var b3 = this._beams[bi3];
                var bAngle3 = b3.baseAngle + time * b3.speed * 2;
                b3.mesh.position.set(
                    orig.x + Math.cos(bAngle3) * 0.15,
                    ballY - 0.3,
                    Math.sin(bAngle3) * 0.15
                );
                b3.mesh.rotation.z = bAngle3;
                b3.mesh.material.opacity = 0.6;
            }

            for (var fi3 = 0; fi3 < this._floorLights.length; fi3++) {
                this._floorLights[fi3].mesh.material.opacity = 0.5 + Math.sin(time * 10 + fi3) * 0.3;
            }
        } else {
            // Disco ball rises, everything fades
            var t5 = (progress - 0.85) / 0.15;
            var riseY = ballY + t5 * 0.5;
            this._discoBall.position.y = riseY;
            this._discoGlow.position.y = riseY;
            this._discoBall.material.opacity = 0.8 * (1 - t5);
            this._discoGlow.material.opacity = 0.3 * (1 - t5);
            this._discoBall.rotation.y = time * 3;

            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var bi4 = 0; bi4 < this._beams.length; bi4++) {
                this._beams[bi4].mesh.material.opacity = 0.4 * (1 - t5);
                if (t5 > 0.8) this._beams[bi4].mesh.visible = false;
            }
            for (var fi4 = 0; fi4 < this._floorLights.length; fi4++) {
                this._floorLights[fi4].mesh.material.opacity = 0.3 * (1 - t5);
                if (t5 > 0.8) this._floorLights[fi4].mesh.visible = false;
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._discoBall) {
            scene.remove(this._discoBall);
            this._discoBall.geometry.dispose();
            this._discoBall.material.dispose();
        }
        if (this._discoGlow) {
            scene.remove(this._discoGlow);
            this._discoGlow.geometry.dispose();
            this._discoGlow.material.dispose();
        }
        if (this._beams) {
            this._beams.forEach(function(b) {
                scene.remove(b.mesh);
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
            });
        }
        if (this._floorLights) {
            this._floorLights.forEach(function(f) {
                scene.remove(f.mesh);
                f.mesh.geometry.dispose();
                f.mesh.material.dispose();
            });
        }
        this._discoBall = this._discoGlow = this._beams = this._floorLights = null;
    }
};
