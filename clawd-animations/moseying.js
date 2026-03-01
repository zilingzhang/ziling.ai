export default {
    name: 'Moseying',
    label: 'moseying',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Tumbleweed (small sphere rolling along ground)
        var twGeo = new THREE.IcosahedronGeometry(0.04, 0);
        var twMat = new THREE.MeshBasicMaterial({
            color: 0xc4a060, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._tumbleweed = new THREE.Mesh(twGeo, twMat);
        this._tumbleweed.position.set(this._origPos.x - 0.8, this._origPos.y - 0.16, 0.1);
        scene.add(this._tumbleweed);
        this._tweedActive = false;

        // Dust trail particles from feet
        this._dust = [];
        var dustGeo = new THREE.SphereGeometry(0.02, 5, 5);
        for (var i = 0; i < 20; i++) {
            var dColors = [0xd4b896, 0xc4a882, 0xbfa078, 0xe0c8a8];
            var dMat = new THREE.MeshBasicMaterial({
                color: dColors[i % dColors.length], transparent: true, opacity: 0,
                depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dMat);
            dust.visible = false;
            scene.add(dust);
            this._dust.push({ mesh: dust, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, grow: 0 });
        }
        this._dustIdx = 0;

        // Desert ground line
        var groundGeo = new THREE.BoxGeometry(1.5, 0.003, 0.003);
        var groundMat = new THREE.MeshBasicMaterial({
            color: 0xc4a060, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._groundLine = new THREE.Mesh(groundGeo, groundMat);
        this._groundLine.position.set(this._origPos.x, this._origPos.y - 0.2, 0);
        scene.add(this._groundLine);

        // Sun glare (distant)
        var sunGeo = new THREE.SphereGeometry(0.08, 10, 10);
        var sunMat = new THREE.MeshBasicMaterial({
            color: 0xffdd66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._sun = new THREE.Mesh(sunGeo, sunMat);
        this._sun.position.set(this._origPos.x + 0.6, this._origPos.y + 0.7, -0.3);
        scene.add(this._sun);

        // Heat shimmer lines
        this._shimmer = [];
        var shimGeo = new THREE.BoxGeometry(0.15, 0.003, 0.002);
        for (var s = 0; s < 5; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffeecc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var shim = new THREE.Mesh(shimGeo, sMat);
            shim.position.set(
                this._origPos.x + (Math.random() - 0.5) * 0.8,
                this._origPos.y - 0.1 + Math.random() * 0.3,
                -0.05
            );
            shim.visible = false;
            scene.add(shim);
            this._shimmer.push({ mesh: shim, phase: Math.random() * Math.PI * 2 });
        }

        this._lastDust = 0;
    },
    _emitDust(x, y) {
        for (var i = 0; i < 2; i++) {
            var d = this._dust[this._dustIdx % this._dust.length];
            this._dustIdx++;
            d.mesh.visible = true;
            d.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y - 0.15, (Math.random() - 0.5) * 0.05);
            d.vx = (Math.random() - 0.5) * 0.15;
            d.vy = 0.05 + Math.random() * 0.1;
            d.vz = (Math.random() - 0.5) * 0.05;
            d.life = 0.8 + Math.random() * 0.5;
            d.maxLife = d.life;
            d.mesh.material.opacity = 0.35;
            d.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
            d.grow = 1.0 + Math.random();
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // Slow amble pace
        var walkCycle = Math.sin(time * 2.5);
        var stepPhase = (time * 2.5) % (Math.PI * 2);

        if (progress < 0.06) {
            // Scene fades in
            var t = progress / 0.06;
            this._groundLine.material.opacity = t * 0.25;
            this._sun.material.opacity = t * 0.2;
            for (var si = 0; si < this._shimmer.length; si++) {
                this._shimmer[si].mesh.visible = true;
                this._shimmer[si].mesh.material.opacity = t * 0.08;
            }
            model.position.set(orig.x, orig.y, orig.z);
        } else if (progress < 0.35) {
            // Casual amble right with swagger
            var t2 = (progress - 0.06) / 0.29;
            var ambleX = orig.x - 0.3 + t2 * 0.6;
            var swaggerSway = Math.sin(time * 2.5) * 0.03;
            var ambleBob = Math.abs(Math.sin(time * 2.5)) * 0.012;

            model.position.set(ambleX + swaggerSway, orig.y + ambleBob, orig.z);
            // Slight swagger lean
            model.rotation.z = swaggerSway * 0.4;
            model.scale.setScalar(gs);

            this._groundLine.material.opacity = 0.25;
            this._sun.material.opacity = 0.2 + Math.sin(time * 0.5) * 0.03;

            // Dust trail
            if (stepPhase < 0.3 && time - this._lastDust > 0.3) {
                this._emitDust(ambleX, orig.y);
                this._lastDust = time;
            }

            // Heat shimmer
            for (var si2 = 0; si2 < this._shimmer.length; si2++) {
                var sh = this._shimmer[si2];
                sh.mesh.position.y = orig.y - 0.1 + Math.sin(time * 1.5 + sh.phase) * 0.05;
                sh.mesh.material.opacity = 0.06 + Math.sin(time * 2 + sh.phase) * 0.03;
            }
        } else if (progress < 0.45) {
            // Tumbleweed passes by
            var t3 = (progress - 0.35) / 0.10;
            var lastX = orig.x + 0.3;
            model.position.set(lastX, orig.y, orig.z);
            model.rotation.z = 0;

            // Tumbleweed rolls across
            this._tweedActive = true;
            this._tumbleweed.material.opacity = Math.min(t3 * 3, 1.0) * 0.6;
            var twX = orig.x - 0.6 + t3 * 1.5;
            this._tumbleweed.position.set(twX, orig.y - 0.16, 0.1);
            this._tumbleweed.rotation.z = -t3 * Math.PI * 4;
            // Model watches it go by (slight rotation following)
            model.rotation.z = Math.sin(t3 * Math.PI) * 0.06;
        } else if (progress < 0.52) {
            // Tips hat (slight forward tilt)
            var t4 = (progress - 0.45) / 0.07;
            var tipAngle = Math.sin(t4 * Math.PI) * 0.1;
            model.position.set(orig.x + 0.3, orig.y - tipAngle * 0.1, orig.z);
            model.rotation.z = tipAngle;
            // Slight scale for nod
            model.scale.set(gs, gs * (1 - tipAngle * 0.15), gs);

            // Tumbleweed continues and fades
            this._tumbleweed.material.opacity = 0.6 * (1 - t4);
            this._tumbleweed.position.x = orig.x + 0.9 + t4 * 0.5;
            this._tumbleweed.rotation.z -= delta * 6;
        } else if (progress < 0.80) {
            // Continue moseying back, relaxed
            var t5 = (progress - 0.52) / 0.28;
            var moseyX = orig.x + 0.3 - t5 * 0.6;
            var moseyBob = Math.abs(Math.sin(time * 2.2)) * 0.01;
            var moseySway = Math.sin(time * 2.2) * 0.025;

            model.position.set(moseyX + moseySway, orig.y + moseyBob, orig.z);
            model.rotation.z = moseySway * 0.35;
            model.scale.setScalar(gs);

            this._tumbleweed.material.opacity = 0;

            if (stepPhase < 0.3 && time - this._lastDust > 0.35) {
                this._emitDust(moseyX, orig.y);
                this._lastDust = time;
            }

            for (var si3 = 0; si3 < this._shimmer.length; si3++) {
                var sh2 = this._shimmer[si3];
                sh2.mesh.position.y = orig.y - 0.1 + Math.sin(time * 1.5 + sh2.phase) * 0.05;
                sh2.mesh.material.opacity = 0.06 + Math.sin(time * 2 + sh2.phase) * 0.03;
            }
        } else {
            // Settle, scene fades
            var t6 = (progress - 0.80) / 0.20;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._groundLine.material.opacity = 0.25 * (1 - t6);
            this._sun.material.opacity = 0.2 * (1 - t6);
            for (var si4 = 0; si4 < this._shimmer.length; si4++) {
                this._shimmer[si4].mesh.material.opacity = 0.06 * (1 - t6);
                if (t6 > 0.8) this._shimmer[si4].mesh.visible = false;
            }
        }

        // Update dust
        for (var di = 0; di < this._dust.length; di++) {
            var dp = this._dust[di];
            if (dp.life <= 0) continue;
            dp.life -= delta;
            if (dp.life <= 0) { dp.mesh.visible = false; continue; }
            dp.mesh.position.x += dp.vx * delta;
            dp.mesh.position.y += dp.vy * delta;
            dp.mesh.position.z += dp.vz * delta;
            var cs = dp.mesh.scale.x;
            dp.mesh.scale.setScalar(cs + dp.grow * delta);
            dp.mesh.material.opacity = 0.35 * (dp.life / dp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._tumbleweed) {
            scene.remove(this._tumbleweed);
            this._tumbleweed.geometry.dispose();
            this._tumbleweed.material.dispose();
        }
        if (this._dust) {
            this._dust.forEach(function(d) {
                scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                d.mesh.material.dispose();
            });
        }
        if (this._groundLine) {
            scene.remove(this._groundLine);
            this._groundLine.geometry.dispose();
            this._groundLine.material.dispose();
        }
        if (this._sun) {
            scene.remove(this._sun);
            this._sun.geometry.dispose();
            this._sun.material.dispose();
        }
        if (this._shimmer) {
            this._shimmer.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        this._tumbleweed = this._dust = this._groundLine = this._sun = this._shimmer = null;
    }
};
