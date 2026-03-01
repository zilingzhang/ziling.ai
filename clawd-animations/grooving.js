export default {
    name: 'Grooving',
    label: 'grooving',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Bass line torus that pulses from below
        this._bassTori = [];
        for (var i = 0; i < 5; i++) {
            var torusGeo = new THREE.TorusGeometry(0.08, 0.012, 8, 24);
            var torusMat = new THREE.MeshBasicMaterial({
                color: 0xff6600, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var torus = new THREE.Mesh(torusGeo, torusMat);
            torus.rotation.x = -Math.PI / 2;
            torus.visible = false;
            scene.add(torus);
            this._bassTori.push({ mesh: torus, life: 0, maxLife: 0, scale: 0 });
        }
        this._bassIdx = 0;

        // Groove trail (curved line segments following model)
        this._trail = [];
        var trailGeo = new THREE.SphereGeometry(0.012, 6, 6);
        for (var j = 0; j < 30; j++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: 0xff8844, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var trail = new THREE.Mesh(trailGeo, tMat);
            trail.visible = false;
            scene.add(trail);
            this._trail.push({ mesh: trail, age: 99 });
        }
        this._trailIdx = 0;

        // Beat visualization rings
        this._beatRings = [];
        var ringGeo = new THREE.RingGeometry(0.06, 0.08, 16);
        for (var k = 0; k < 4; k++) {
            var rColors = [0xaa44ff, 0xff6600, 0xaa44ff, 0xff8844];
            var rMat = new THREE.MeshBasicMaterial({
                color: rColors[k], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var ring = new THREE.Mesh(ringGeo, rMat);
            ring.visible = false;
            scene.add(ring);
            this._beatRings.push({ mesh: ring, life: 0, maxLife: 0, scale: 0 });
        }
        this._ringIdx = 0;

        // Flow state glow (surrounding halo)
        var glowGeo = new THREE.SphereGeometry(0.2, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x8833ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._flowGlow = new THREE.Mesh(glowGeo, glowMat);
        this._flowGlow.position.copy(this._origPos);
        scene.add(this._flowGlow);

        // Floor pulse disc
        var floorGeo = new THREE.CircleGeometry(0.5, 24);
        var floorMat = new THREE.MeshBasicMaterial({
            color: 0x6622aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._floorPulse = new THREE.Mesh(floorGeo, floorMat);
        this._floorPulse.rotation.x = -Math.PI / 2;
        this._floorPulse.position.set(this._origPos.x, this._origPos.y - 0.2, 0);
        scene.add(this._floorPulse);

        this._lastBass = 0;
        this._lastTrail = 0;
        this._lastRing = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // Funky beat (~100 BPM groove)
        var bpm = 100;
        var beat = (time * bpm / 60) % 1.0;
        var onBeat = beat < 0.15;
        var halfBeat = ((time * bpm / 60) + 0.5) % 1.0 < 0.15;

        if (progress < 0.08) {
            // Floor pulse fades in, groove starts
            var t = progress / 0.08;
            this._floorPulse.material.opacity = t * 0.1;
            model.position.set(orig.x, orig.y, orig.z);
        } else if (progress < 0.25) {
            // Groove builds: side-to-side sway
            var t2 = (progress - 0.08) / 0.17;
            var swayAmt = t2 * 0.15;
            var sway = Math.sin(time * bpm / 60 * Math.PI) * swayAmt;

            model.position.set(orig.x + sway, orig.y, orig.z);
            model.rotation.z = sway * 0.3;

            // Gentle squash on beats
            if (onBeat) {
                model.scale.set(gs * (1 + t2 * 0.05), gs * (1 - t2 * 0.04), gs);
            } else {
                model.scale.setScalar(gs);
            }

            this._floorPulse.material.opacity = 0.1 + (onBeat ? 0.08 * t2 : 0);
            this._flowGlow.position.set(orig.x + sway, orig.y, 0);
            this._flowGlow.material.opacity = t2 * 0.05;

            // Start bass tori
            if (onBeat && time - this._lastBass > 0.4) {
                var bt = this._bassTori[this._bassIdx % this._bassTori.length];
                this._bassIdx++;
                bt.mesh.visible = true;
                bt.mesh.position.set(orig.x, orig.y - 0.18, 0);
                bt.scale = 0.3;
                bt.life = 1.0;
                bt.maxLife = 1.0;
                bt.mesh.material.opacity = 0.5 * t2;
                this._lastBass = time;
            }
        } else if (progress < 0.65) {
            // Full groove: deep sway, beat rings, trail
            var t3 = (progress - 0.25) / 0.40;
            var deepSway = Math.sin(time * bpm / 60 * Math.PI) * 0.2;
            var grooveBob = Math.abs(Math.sin(time * bpm / 60 * Math.PI * 2)) * 0.06;

            model.position.set(orig.x + deepSway, orig.y + grooveBob, orig.z);
            model.rotation.z = deepSway * 0.35;

            // Squash/stretch with the rhythm
            if (onBeat) {
                model.scale.set(gs * 1.06, gs * 0.92, gs);
            } else if (halfBeat) {
                model.scale.set(gs * 0.95, gs * 1.04, gs);
            } else {
                model.scale.set(gs * (1 + grooveBob * 0.2), gs * (1 - grooveBob * 0.15), gs);
            }

            // Floor pulse
            this._floorPulse.material.opacity = 0.1 + (onBeat ? 0.15 : 0);
            var floorHue = (time * 0.2) % 1.0;
            this._floorPulse.material.color.setHSL(floorHue > 0.5 ? 0.75 : 0.08, 0.8, 0.3);

            // Flow glow follows and pulses
            this._flowGlow.position.set(orig.x + deepSway, orig.y + grooveBob, 0);
            this._flowGlow.material.opacity = 0.08 + (onBeat ? 0.06 : 0);

            // Bass tori on beat
            if (onBeat && time - this._lastBass > 0.35) {
                var bt2 = this._bassTori[this._bassIdx % this._bassTori.length];
                this._bassIdx++;
                bt2.mesh.visible = true;
                bt2.mesh.position.set(orig.x + deepSway, orig.y - 0.18, 0);
                bt2.scale = 0.3;
                bt2.life = 1.2;
                bt2.maxLife = 1.2;
                bt2.mesh.material.opacity = 0.6;
                this._lastBass = time;
            }

            // Beat rings
            if (halfBeat && time - this._lastRing > 0.3) {
                var br = this._beatRings[this._ringIdx % this._beatRings.length];
                this._ringIdx++;
                br.mesh.visible = true;
                br.mesh.position.set(orig.x + deepSway, orig.y + 0.1, 0.05);
                br.scale = 0.5;
                br.life = 0.6;
                br.maxLife = 0.6;
                br.mesh.material.opacity = 0.5;
                this._lastRing = time;
            }

            // Trail
            if (time - this._lastTrail > 0.04) {
                var tr = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr.mesh.visible = true;
                tr.mesh.position.set(orig.x + deepSway, orig.y + grooveBob, 0);
                tr.age = 0;
                tr.mesh.material.opacity = 0.4;
                this._lastTrail = time;
            }
        } else if (progress < 0.85) {
            // Peak groove: extra sway, more intensity
            var t4 = (progress - 0.65) / 0.20;
            var peakSway = Math.sin(time * bpm / 60 * Math.PI) * 0.25;
            var peakBob = Math.abs(Math.sin(time * bpm / 60 * Math.PI * 2)) * 0.1;
            var lateralDip = Math.sin(time * bpm / 120 * Math.PI) * 0.04;

            model.position.set(orig.x + peakSway, orig.y + peakBob + lateralDip, orig.z);
            model.rotation.z = peakSway * 0.4;

            if (onBeat) {
                model.scale.set(gs * 1.08, gs * 0.88, gs);
            } else {
                model.scale.set(gs * 0.96, gs * 1.04, gs);
            }

            this._flowGlow.position.set(orig.x + peakSway, orig.y + peakBob, 0);
            this._flowGlow.material.opacity = 0.12 + Math.sin(time * 3) * 0.04;
            this._floorPulse.material.opacity = 0.12 + (onBeat ? 0.2 : 0);

            if (onBeat && time - this._lastBass > 0.3) {
                var bt3 = this._bassTori[this._bassIdx % this._bassTori.length];
                this._bassIdx++;
                bt3.mesh.visible = true;
                bt3.mesh.position.set(orig.x + peakSway, orig.y - 0.18, 0);
                bt3.scale = 0.3;
                bt3.life = 1.0;
                bt3.maxLife = 1.0;
                bt3.mesh.material.opacity = 0.7;
                this._lastBass = time;
            }

            if (time - this._lastTrail > 0.03) {
                var tr2 = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr2.mesh.visible = true;
                tr2.mesh.position.set(orig.x + peakSway, orig.y + peakBob, 0);
                tr2.age = 0;
                tr2.mesh.material.opacity = 0.5;
                this._lastTrail = time;
            }
        } else {
            // Cool down
            var t5 = (progress - 0.85) / 0.15;
            var fadeSway = Math.sin(time * 2) * 0.08 * (1 - t5);

            model.position.set(orig.x + fadeSway, orig.y, orig.z);
            model.rotation.z = fadeSway * 0.2;
            model.scale.copy(this._origScale);

            this._flowGlow.material.opacity = 0.1 * (1 - t5);
            this._floorPulse.material.opacity = 0.1 * (1 - t5);
        }

        // Update bass tori
        for (var bi = 0; bi < this._bassTori.length; bi++) {
            var bass = this._bassTori[bi];
            if (bass.life <= 0) continue;
            bass.life -= delta;
            if (bass.life <= 0) { bass.mesh.visible = false; continue; }
            bass.scale += delta * 1.2;
            bass.mesh.scale.setScalar(bass.scale);
            bass.mesh.material.opacity = 0.6 * (bass.life / bass.maxLife);
            var bHue = (time * 0.3 + bi * 0.2) % 1.0;
            bass.mesh.material.color.setHSL(bHue > 0.5 ? 0.08 : 0.78, 0.9, 0.5);
        }

        // Update beat rings
        for (var ri = 0; ri < this._beatRings.length; ri++) {
            var br2 = this._beatRings[ri];
            if (br2.life <= 0) continue;
            br2.life -= delta;
            if (br2.life <= 0) { br2.mesh.visible = false; continue; }
            br2.scale += delta * 2.5;
            br2.mesh.scale.setScalar(br2.scale);
            br2.mesh.material.opacity = 0.5 * (br2.life / br2.maxLife);
        }

        // Update trail (age-based fade)
        for (var ti = 0; ti < this._trail.length; ti++) {
            var tp = this._trail[ti];
            if (!tp.mesh.visible) continue;
            tp.age += delta;
            if (tp.age > 1.5) { tp.mesh.visible = false; continue; }
            tp.mesh.material.opacity = 0.4 * Math.max(0, 1 - tp.age / 1.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._bassTori) {
            this._bassTori.forEach(function(b) {
                scene.remove(b.mesh);
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
            });
        }
        if (this._trail) {
            this._trail.forEach(function(t) {
                scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
            });
        }
        if (this._beatRings) {
            this._beatRings.forEach(function(r) {
                scene.remove(r.mesh);
                r.mesh.geometry.dispose();
                r.mesh.material.dispose();
            });
        }
        if (this._flowGlow) {
            scene.remove(this._flowGlow);
            this._flowGlow.geometry.dispose();
            this._flowGlow.material.dispose();
        }
        if (this._floorPulse) {
            scene.remove(this._floorPulse);
            this._floorPulse.geometry.dispose();
            this._floorPulse.material.dispose();
        }
        this._bassTori = this._trail = this._beatRings = this._flowGlow = this._floorPulse = null;
    }
};
