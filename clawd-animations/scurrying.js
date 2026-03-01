export default {
    name: 'Scurrying',
    label: 'scurrying',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Shadow particles following underneath
        this._shadows = [];
        var shadowGeo = new THREE.CircleGeometry(0.025, 8);
        for (var i = 0; i < 8; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0x222211, transparent: true, opacity: 0,
                depthWrite: false, side: THREE.DoubleSide
            });
            var shadow = new THREE.Mesh(shadowGeo, sMat);
            shadow.rotation.x = -Math.PI / 2;
            shadow.visible = false;
            scene.add(shadow);
            this._shadows.push({ mesh: shadow, age: 99 });
        }
        this._shadowIdx = 0;

        // Quick footstep dust
        this._dust = [];
        var dustGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var j = 0; j < 18; j++) {
            var dColors = [0x887766, 0x998877, 0x776655, 0x665544];
            var dMat = new THREE.MeshBasicMaterial({
                color: dColors[j % dColors.length], transparent: true, opacity: 0,
                depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dMat);
            dust.visible = false;
            scene.add(dust);
            this._dust.push({ mesh: dust, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, grow: 0 });
        }
        this._dustIdx = 0;

        // Safe haven glow circle at destination
        var havenGeo = new THREE.RingGeometry(0.08, 0.12, 24);
        var havenMat = new THREE.MeshBasicMaterial({
            color: 0x44cc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._haven = new THREE.Mesh(havenGeo, havenMat);
        this._haven.rotation.x = -Math.PI / 2;
        this._haven.visible = false;
        scene.add(this._haven);

        // Haven inner glow
        var havenInnerGeo = new THREE.CircleGeometry(0.08, 16);
        var havenInnerMat = new THREE.MeshBasicMaterial({
            color: 0x22aa22, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._havenInner = new THREE.Mesh(havenInnerGeo, havenInnerMat);
        this._havenInner.rotation.x = -Math.PI / 2;
        this._havenInner.visible = false;
        scene.add(this._havenInner);

        // Scurry path: sharp angle direction changes
        this._path = [
            { x: 0, y: 0 },
            { x: 0.2, y: 0.02 },
            { x: 0.15, y: -0.03 },
            { x: -0.1, y: -0.01 },
            { x: -0.25, y: 0.02 },
            { x: -0.15, y: -0.02 },
            { x: 0.1, y: 0.01 },
            { x: 0.35, y: 0 },
            { x: 0.4, y: -0.01 },
            { x: 0.45, y: 0 }
        ];
        this._havenPos = { x: this._origPos.x + 0.45, y: this._origPos.y };

        this._lastDust = 0;
        this._lastShadow = 0;
        this._lookBackTime = 0;
    },
    _emitDust(x, y) {
        for (var i = 0; i < 2; i++) {
            var d = this._dust[this._dustIdx % this._dust.length];
            this._dustIdx++;
            d.mesh.visible = true;
            d.mesh.position.set(x + (Math.random() - 0.5) * 0.04, y - 0.15, (Math.random() - 0.5) * 0.04);
            d.vx = (Math.random() - 0.5) * 0.3;
            d.vy = 0.1 + Math.random() * 0.2;
            d.vz = (Math.random() - 0.5) * 0.1;
            d.life = 0.4 + Math.random() * 0.3;
            d.maxLife = d.life;
            d.mesh.material.opacity = 0.4;
            d.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
            d.grow = 1.0 + Math.random() * 1.5;
        }
    },
    _getPathPos(t) {
        var total = this._path.length - 1;
        var idx = t * total;
        var i0 = Math.floor(idx);
        var i1 = Math.min(i0 + 1, total);
        var frac = idx - i0;
        // Sharp transitions
        var eased = frac < 0.5 ? 2 * frac * frac : 1 - 2 * (1 - frac) * (1 - frac);
        return {
            x: this._path[i0].x + (this._path[i1].x - this._path[i0].x) * eased,
            y: this._path[i0].y + (this._path[i1].y - this._path[i0].y) * eased
        };
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.06) {
            // Alert/startle, hunches down
            var t = progress / 0.06;
            model.position.set(orig.x, orig.y - t * 0.04, orig.z);
            model.scale.set(gs * (1 + t * 0.08), gs * (1 - t * 0.1), gs);
            model.rotation.z = 0;
        } else if (progress < 0.65) {
            // Main scurrying: low, fast, sharp angles
            var t2 = (progress - 0.06) / 0.59;
            var pos = this._getPathPos(t2);

            // Fast bob (scurrying steps)
            var scurryBob = Math.abs(Math.sin(time * 18)) * 0.015;
            model.position.set(orig.x + pos.x, orig.y + pos.y - 0.04 + scurryBob, orig.z);

            // Hunched posture (wider, shorter)
            model.scale.set(gs * 1.08, gs * 0.88, gs);

            // Lean in direction of movement
            model.rotation.z = -pos.x * 0.2;

            // Quick looks over shoulder (rotation snaps)
            if (Math.sin(time * 3) > 0.95 && time - this._lookBackTime > 1.0) {
                model.rotation.z = 0.15;
                this._lookBackTime = time;
            } else if (time - this._lookBackTime < 0.15) {
                model.rotation.z = 0.15 * (1 - (time - this._lookBackTime) / 0.15);
            }

            // Shadows underneath
            if (time - this._lastShadow > 0.06) {
                var sh = this._shadows[this._shadowIdx % this._shadows.length];
                this._shadowIdx++;
                sh.mesh.visible = true;
                sh.mesh.position.set(orig.x + pos.x, orig.y - 0.19, 0);
                sh.age = 0;
                sh.mesh.material.opacity = 0.15;
                this._lastShadow = time;
            }

            // Dust from fast movement
            if (time - this._lastDust > 0.08) {
                this._emitDust(orig.x + pos.x, orig.y + pos.y);
                this._lastDust = time;
            }
        } else if (progress < 0.78) {
            // Haven appears, final dash
            var t3 = (progress - 0.65) / 0.13;
            var finalX = orig.x + 0.45;
            var rushX = orig.x + this._path[this._path.length - 2].x + (finalX - orig.x - this._path[this._path.length - 2].x) * t3;
            var rushBob = Math.abs(Math.sin(time * 22)) * 0.01;

            model.position.set(rushX, orig.y - 0.04 + rushBob, orig.z);
            model.scale.set(gs * 1.1, gs * 0.85, gs);
            model.rotation.z = -0.08;

            // Haven glow appears
            this._haven.visible = true;
            this._haven.position.set(this._havenPos.x, orig.y - 0.19, 0);
            this._haven.material.opacity = t3 * 0.4;
            this._haven.scale.setScalar(1 + Math.sin(time * 4) * 0.1);

            this._havenInner.visible = true;
            this._havenInner.position.set(this._havenPos.x, orig.y - 0.19, 0);
            this._havenInner.material.opacity = t3 * 0.2;

            if (time - this._lastDust > 0.05) {
                this._emitDust(rushX, orig.y);
                this._lastDust = time;
            }
        } else if (progress < 0.88) {
            // Arrived at safe haven, relief
            var t4 = (progress - 0.78) / 0.10;

            model.position.set(this._havenPos.x, orig.y - 0.04 * (1 - t4), orig.z);
            // Uncurl from hunched posture
            model.scale.set(gs * (1.08 - t4 * 0.08), gs * (0.88 + t4 * 0.12), gs);
            model.rotation.z = 0;

            this._haven.material.opacity = 0.4 + Math.sin(time * 3) * 0.1;
            this._havenInner.material.opacity = 0.2 + Math.sin(time * 3) * 0.05;
        } else {
            // Return to origin, everything fades
            var t5 = (progress - 0.88) / 0.12;
            var returnX = this._havenPos.x + (orig.x - this._havenPos.x) * t5;
            model.position.set(returnX, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._haven.material.opacity = 0.4 * (1 - t5);
            this._havenInner.material.opacity = 0.2 * (1 - t5);
            if (t5 > 0.7) {
                this._haven.visible = false;
                this._havenInner.visible = false;
            }
        }

        // Update shadows
        for (var si = 0; si < this._shadows.length; si++) {
            var shp = this._shadows[si];
            if (!shp.mesh.visible) continue;
            shp.age += delta;
            if (shp.age > 0.5) { shp.mesh.visible = false; continue; }
            shp.mesh.material.opacity = 0.15 * Math.max(0, 1 - shp.age / 0.5);
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
            dp.mesh.material.opacity = 0.4 * (dp.life / dp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._shadows) {
            this._shadows.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        if (this._dust) {
            this._dust.forEach(function(d) {
                scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                d.mesh.material.dispose();
            });
        }
        if (this._haven) {
            scene.remove(this._haven);
            this._haven.geometry.dispose();
            this._haven.material.dispose();
        }
        if (this._havenInner) {
            scene.remove(this._havenInner);
            this._havenInner.geometry.dispose();
            this._havenInner.material.dispose();
        }
        this._shadows = this._dust = this._haven = this._havenInner = null;
    }
};
