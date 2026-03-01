export default {
    name: 'Scampering',
    label: 'scampering',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Tiny footprint particles
        this._footprints = [];
        var fpGeo = new THREE.CircleGeometry(0.008, 6);
        for (var i = 0; i < 25; i++) {
            var fpMat = new THREE.MeshBasicMaterial({
                color: 0xaaaaaa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var fp = new THREE.Mesh(fpGeo, fpMat);
            fp.rotation.x = -Math.PI / 2;
            fp.visible = false;
            scene.add(fp);
            this._footprints.push({ mesh: fp, life: 0, maxLife: 0 });
        }
        this._fpIdx = 0;

        // Nervous energy sparks
        this._sparks = [];
        var sparkGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var j = 0; j < 15; j++) {
            var sColors = [0xffff88, 0xffcc44, 0xffee66, 0xeedd44];
            var sMat = new THREE.MeshBasicMaterial({
                color: sColors[j % sColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spark = new THREE.Mesh(sparkGeo, sMat);
            spark.visible = false;
            scene.add(spark);
            this._sparks.push({ mesh: spark, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._sparkIdx = 0;

        // Precompute scamper waypoints (short bursts with pauses)
        this._waypoints = [
            { x: 0, y: 0, pause: false },
            { x: 0.2, y: 0.02, pause: false },
            { x: 0.25, y: 0, pause: true },
            { x: 0.1, y: -0.02, pause: false },
            { x: -0.15, y: 0.01, pause: false },
            { x: -0.2, y: 0, pause: true },
            { x: -0.05, y: 0.03, pause: false },
            { x: 0.3, y: -0.01, pause: false },
            { x: 0.35, y: 0, pause: true },
            { x: 0.15, y: 0.02, pause: false },
            { x: -0.1, y: 0, pause: false },
            { x: 0, y: 0, pause: false }
        ];

        this._lastFp = 0;
        this._lastSpark = 0;
    },
    _emitSparks(x, y, count) {
        for (var i = 0; i < count; i++) {
            var s = this._sparks[this._sparkIdx % this._sparks.length];
            this._sparkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.06, y + Math.random() * 0.1, (Math.random() - 0.5) * 0.04);
            var angle = Math.random() * Math.PI * 2;
            var spd = 0.5 + Math.random() * 1.0;
            s.vx = Math.cos(angle) * spd;
            s.vy = 0.5 + Math.random() * 1.0;
            s.vz = (Math.random() - 0.5) * 0.3;
            s.life = 0.2 + Math.random() * 0.2;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.8;
        }
    },
    _getScamperPos(progress) {
        var totalWP = this._waypoints.length - 1;
        var idx = progress * totalWP;
        var i0 = Math.floor(idx);
        var i1 = Math.min(i0 + 1, totalWP);
        var frac = idx - i0;

        var wp0 = this._waypoints[i0];
        var wp1 = this._waypoints[i1];

        // Quick acceleration, sudden stops
        var eased;
        if (wp1.pause) {
            eased = 1 - Math.pow(1 - frac, 4); // Sharp deceleration
        } else {
            eased = frac * frac; // Quick start
        }

        return {
            x: wp0.x + (wp1.x - wp0.x) * eased,
            y: wp0.y + (wp1.y - wp0.y) * eased,
            isPause: wp1.pause && frac > 0.7
        };
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.05) {
            // Alert! Quick startle
            var t = progress / 0.05;
            model.position.set(orig.x, orig.y + t * 0.03, orig.z);
            model.scale.set(gs * (1 - t * 0.05), gs * (1 + t * 0.08), gs);
        } else if (progress < 0.85) {
            // Main scampering sequence
            var t2 = (progress - 0.05) / 0.80;
            var pos = this._getScamperPos(t2);

            if (pos.isPause) {
                // Freeze! Complete stop
                model.position.set(orig.x + pos.x, orig.y + pos.y, orig.z);
                model.scale.setScalar(gs);
                model.rotation.z = 0;
                // Slight nervous twitch
                if (Math.sin(time * 20) > 0.95) {
                    model.rotation.z = (Math.random() - 0.5) * 0.04;
                }
            } else {
                // Rapid tiny steps
                var scurryBob = Math.abs(Math.sin(time * 20)) * 0.02;
                model.position.set(orig.x + pos.x, orig.y + pos.y + scurryBob, orig.z);

                // Quick direction leans
                var dx = pos.x;
                model.rotation.z = -dx * 0.3;

                // Tiny squash/stretch with fast steps
                var stepPhase = Math.sin(time * 20);
                if (stepPhase > 0.5) {
                    model.scale.set(gs * 0.96, gs * 1.05, gs);
                } else {
                    model.scale.set(gs * 1.03, gs * 0.97, gs);
                }

                // Footprints
                if (time - this._lastFp > 0.06) {
                    var fp = this._footprints[this._fpIdx % this._footprints.length];
                    this._fpIdx++;
                    fp.mesh.visible = true;
                    fp.mesh.position.set(orig.x + pos.x, orig.y - 0.19, 0);
                    fp.life = 1.0;
                    fp.maxLife = 1.0;
                    fp.mesh.material.opacity = 0.3;
                    this._lastFp = time;
                }

                // Nervous sparks during bursts
                if (time - this._lastSpark > 0.1 && !pos.isPause) {
                    this._emitSparks(orig.x + pos.x, orig.y + pos.y, 2);
                    this._lastSpark = time;
                }
            }
        } else {
            // Settle back
            var t3 = (progress - 0.85) / 0.15;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;
            // Slight panting (rapid tiny scale oscillation that fades)
            var pant = Math.sin(time * 10) * 0.015 * (1 - t3);
            model.scale.set(gs * (1 + pant), gs * (1 - pant), gs);
        }

        // Update footprints
        for (var fi = 0; fi < this._footprints.length; fi++) {
            var fpp = this._footprints[fi];
            if (fpp.life <= 0) continue;
            fpp.life -= delta;
            if (fpp.life <= 0) { fpp.mesh.visible = false; continue; }
            fpp.mesh.material.opacity = 0.3 * (fpp.life / fpp.maxLife);
        }

        // Update sparks
        for (var si = 0; si < this._sparks.length; si++) {
            var sp = this._sparks[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 2.0 * delta;
            sp.mesh.material.opacity = 0.8 * (sp.life / sp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._footprints) {
            this._footprints.forEach(function(f) {
                scene.remove(f.mesh);
                f.mesh.geometry.dispose();
                f.mesh.material.dispose();
            });
        }
        if (this._sparks) {
            this._sparks.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        this._footprints = this._sparks = null;
    }
};
