export default {
    name: 'Beboppin\'',
    label: 'beboppin',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Bass note ring tori that pulse from floor
        this._bassRings = [];
        for (var i = 0; i < 6; i++) {
            var ringGeo = new THREE.TorusGeometry(0.05, 0.008, 8, 24);
            var ringMat = new THREE.MeshBasicMaterial({
                color: 0xdaa520, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.visible = false;
            scene.add(ring);
            this._bassRings.push({ mesh: ring, life: 0, maxLife: 0, scale: 0 });
        }
        this._bassIdx = 0;

        // Snap flash particles (at hand positions)
        this._snaps = [];
        var snapGeo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var j = 0; j < 15; j++) {
            var snapMat = new THREE.MeshBasicMaterial({
                color: 0xffd700, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var snap = new THREE.Mesh(snapGeo, snapMat);
            snap.visible = false;
            scene.add(snap);
            this._snaps.push({ mesh: snap, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._snapIdx = 0;

        // Jazz club ambient glow (floor disc)
        var floorGeo = new THREE.CircleGeometry(0.6, 24);
        var floorMat = new THREE.MeshBasicMaterial({
            color: 0x4a0e4e, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._floorGlow = new THREE.Mesh(floorGeo, floorMat);
        this._floorGlow.rotation.x = -Math.PI / 2;
        this._floorGlow.position.set(this._origPos.x, this._origPos.y - 0.2, 0);
        scene.add(this._floorGlow);

        // Spotlight cone
        var spotGeo = new THREE.ConeGeometry(0.25, 0.8, 12, 1, true);
        var spotMat = new THREE.MeshBasicMaterial({
            color: 0xdaa520, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._spotlight = new THREE.Mesh(spotGeo, spotMat);
        this._spotlight.position.set(this._origPos.x, this._origPos.y + 0.5, 0);
        scene.add(this._spotlight);

        this._lastSnap = 0;
        this._lastBass = 0;
    },
    _emitSnap(x, y) {
        for (var i = 0; i < 3; i++) {
            var s = this._snaps[this._snapIdx % this._snaps.length];
            this._snapIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y + (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
            var angle = Math.random() * Math.PI * 2;
            var spd = 0.8 + Math.random() * 1.2;
            s.vx = Math.cos(angle) * spd;
            s.vy = Math.sin(angle) * spd * 0.5 + 0.5;
            s.vz = (Math.random() - 0.5) * 0.4;
            s.life = 0.3 + Math.random() * 0.2;
            s.maxLife = s.life;
            s.mesh.material.opacity = 1.0;
            s.mesh.scale.setScalar(0.5 + Math.random() * 1.0);
        }
    },
    _emitBassRing(x, y) {
        var r = this._bassRings[this._bassIdx % this._bassRings.length];
        this._bassIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(x, y - 0.18, 0);
        r.scale = 0.3;
        r.mesh.scale.setScalar(r.scale);
        r.life = 1.2;
        r.maxLife = 1.2;
        r.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // Swing rhythm: syncopated BPM (~140 jazz tempo)
        var bpm = 140;
        var beatRaw = (time * bpm / 60);
        var beat = beatRaw % 1.0;
        var offbeat = (beatRaw + 0.5) % 1.0;
        var onOffbeat = offbeat < 0.15;

        if (progress < 0.08) {
            // Spotlight fades in, model settles into groove
            var t = progress / 0.08;
            this._spotlight.material.opacity = t * 0.12;
            this._floorGlow.material.opacity = t * 0.15;
            model.position.set(orig.x, orig.y, orig.z);
        } else if (progress < 0.25) {
            // Head bob starts, gentle offbeat bounce
            var t2 = (progress - 0.08) / 0.17;
            this._spotlight.material.opacity = 0.12;
            this._floorGlow.material.opacity = 0.15 + Math.sin(time * 3) * 0.03;

            var hopAmt = t2 * 0.08;
            var hop = onOffbeat ? hopAmt : hopAmt * 0.3;
            model.position.set(orig.x, orig.y + hop, orig.z);

            // Head bob (slight forward tilt on offbeats)
            model.rotation.z = onOffbeat ? 0.06 * t2 : -0.02 * t2;

            // Snaps start
            if (onOffbeat && time - this._lastSnap > 0.3) {
                var handX = orig.x + (Math.sin(time * 2) > 0 ? 0.15 : -0.15);
                this._emitSnap(handX, orig.y + 0.15);
                this._lastSnap = time;
            }
        } else if (progress < 0.70) {
            // Full bebop groove: offbeat hops, sway, snaps, bass rings
            var t3 = (progress - 0.25) / 0.45;
            this._spotlight.material.opacity = 0.12 + Math.sin(time * 4) * 0.04;
            this._floorGlow.material.opacity = 0.15 + Math.sin(time * 3) * 0.05;

            // Syncopated hop on offbeats
            var hopHeight = onOffbeat ? 0.12 : 0.02;
            // Swing sway
            var swayX = Math.sin(time * bpm / 60 * Math.PI * 0.5) * 0.12;
            model.position.set(orig.x + swayX, orig.y + hopHeight, orig.z);

            // Squash/stretch with swing feel
            if (onOffbeat) {
                model.scale.set(gs * 0.93, gs * 1.1, gs);
            } else {
                model.scale.set(gs * 1.03, gs * 0.97, gs);
            }

            // Cool lean
            model.rotation.z = swayX * 0.3 + (onOffbeat ? 0.05 : -0.03);

            // Snap particles on offbeats
            if (onOffbeat && time - this._lastSnap > 0.25) {
                var side = Math.sin(time * 1.5) > 0 ? 1 : -1;
                this._emitSnap(orig.x + side * 0.18, orig.y + 0.12);
                this._lastSnap = time;
            }

            // Bass ring pulses on downbeats
            if (beat < 0.1 && time - this._lastBass > 0.35) {
                this._emitBassRing(orig.x, orig.y);
                this._lastBass = time;
            }

            // Spotlight sways with model
            this._spotlight.position.x = orig.x + swayX * 0.5;
        } else if (progress < 0.85) {
            // Peak: double-time feel, more intense
            var t4 = (progress - 0.70) / 0.15;
            var fastBeat = (time * bpm * 2 / 60) % 1.0;
            var fastOff = (time * bpm * 2 / 60 + 0.5) % 1.0 < 0.15;

            var bigHop = fastOff ? 0.15 : 0.03;
            var bigSway = Math.sin(time * bpm / 60 * Math.PI) * 0.18;
            model.position.set(orig.x + bigSway, orig.y + bigHop, orig.z);

            if (fastOff) {
                model.scale.set(gs * 0.9, gs * 1.12, gs);
            } else {
                model.scale.set(gs * 1.04, gs * 0.95, gs);
            }
            model.rotation.z = bigSway * 0.35;

            // Rapid snaps
            if (fastOff && time - this._lastSnap > 0.15) {
                this._emitSnap(orig.x + bigSway, orig.y + 0.15);
                this._lastSnap = time;
            }
            if (fastBeat < 0.1 && time - this._lastBass > 0.2) {
                this._emitBassRing(orig.x, orig.y);
                this._lastBass = time;
            }

            this._spotlight.material.opacity = 0.15 + Math.sin(time * 6) * 0.06;
            this._floorGlow.material.opacity = 0.2 + Math.sin(time * 5) * 0.06;
        } else {
            // Cool down: smooth settle, last lingering snap
            var t5 = (progress - 0.85) / 0.15;
            var fadeSwing = (1 - t5);
            var lastSway = Math.sin(time * 2) * 0.06 * fadeSwing;
            model.position.set(orig.x + lastSway, orig.y, orig.z);
            model.rotation.z = lastSway * 0.15;
            model.scale.set(gs, gs, gs);

            this._spotlight.material.opacity = 0.12 * (1 - t5);
            this._floorGlow.material.opacity = 0.15 * (1 - t5);
        }

        // Update bass rings
        for (var ri = 0; ri < this._bassRings.length; ri++) {
            var br = this._bassRings[ri];
            if (br.life <= 0) continue;
            br.life -= delta;
            if (br.life <= 0) { br.mesh.visible = false; continue; }
            br.scale += delta * 1.5;
            br.mesh.scale.setScalar(br.scale);
            br.mesh.material.opacity = 0.7 * (br.life / br.maxLife);
            br.mesh.material.color.setHSL(0.12, 0.8, 0.4 + (1 - br.life / br.maxLife) * 0.2);
        }

        // Update snap particles
        for (var si = 0; si < this._snaps.length; si++) {
            var sp = this._snaps[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 1.5 * delta;
            sp.mesh.material.opacity = (sp.life / sp.maxLife);
            sp.mesh.scale.setScalar(0.5 + (1 - sp.life / sp.maxLife) * 1.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._bassRings) {
            this._bassRings.forEach(function(r) {
                scene.remove(r.mesh);
                r.mesh.geometry.dispose();
                r.mesh.material.dispose();
            });
        }
        if (this._snaps) {
            this._snaps.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        if (this._floorGlow) {
            scene.remove(this._floorGlow);
            this._floorGlow.geometry.dispose();
            this._floorGlow.material.dispose();
        }
        if (this._spotlight) {
            scene.remove(this._spotlight);
            this._spotlight.geometry.dispose();
            this._spotlight.material.dispose();
        }
        this._bassRings = this._snaps = this._floorGlow = this._spotlight = null;
    }
};
