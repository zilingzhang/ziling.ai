export default {
    name: 'Swooping',
    label: 'swooping',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Wind trail particles
        this._wind = [];
        var windGeo = new THREE.BoxGeometry(0.15, 0.003, 0.002);
        for (var i = 0; i < 20; i++) {
            var wColors = [0xaaddff, 0xcceeFF, 0x88bbdd, 0xbbddff];
            var wMat = new THREE.MeshBasicMaterial({
                color: wColors[i % wColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var wind = new THREE.Mesh(windGeo, wMat);
            wind.visible = false;
            scene.add(wind);
            this._wind.push({ mesh: wind, life: 0, maxLife: 0, vx: 0, vy: 0 });
        }
        this._windIdx = 0;

        // Feather particles (shed on dive)
        this._feathers = [];
        var featherGeo = new THREE.PlaneGeometry(0.02, 0.008);
        for (var j = 0; j < 12; j++) {
            var fColors = [0x8b6914, 0xa0784e, 0x6b5030, 0xc4a060, 0x907040];
            var fMat = new THREE.MeshBasicMaterial({
                color: fColors[j % fColors.length], transparent: true, opacity: 0,
                depthWrite: false, side: THREE.DoubleSide
            });
            var feather = new THREE.Mesh(featherGeo, fMat);
            feather.visible = false;
            scene.add(feather);
            this._feathers.push({ mesh: feather, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rv: 0, drift: 0 });
        }
        this._featherIdx = 0;

        // Sky gradient disc (backdrop)
        var skyGeo = new THREE.CircleGeometry(0.8, 24);
        var skyMat = new THREE.MeshBasicMaterial({
            color: 0x4488cc, transparent: true, opacity: 0,
            depthWrite: false, side: THREE.DoubleSide
        });
        this._sky = new THREE.Mesh(skyGeo, skyMat);
        this._sky.position.set(this._origPos.x, this._origPos.y + 0.2, -0.3);
        scene.add(this._sky);

        // Ground line
        var groundGeo = new THREE.BoxGeometry(1.5, 0.003, 0.003);
        var groundMat = new THREE.MeshBasicMaterial({
            color: 0x8b7355, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._ground = new THREE.Mesh(groundGeo, groundMat);
        this._ground.position.set(this._origPos.x, this._origPos.y - 0.2, 0);
        scene.add(this._ground);

        // Apex pause glow
        var apexGeo = new THREE.SphereGeometry(0.1, 10, 10);
        var apexMat = new THREE.MeshBasicMaterial({
            color: 0xaaddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._apexGlow = new THREE.Mesh(apexGeo, apexMat);
        this._apexGlow.visible = false;
        scene.add(this._apexGlow);

        this._lastWind = 0;
        this._lastFeather = 0;
    },
    _emitWind(x, y, direction) {
        for (var i = 0; i < 2; i++) {
            var w = this._wind[this._windIdx % this._wind.length];
            this._windIdx++;
            w.mesh.visible = true;
            w.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.04);
            w.mesh.scale.set(0.5 + Math.random() * 1.5, 1, 1);
            w.vx = direction * (1.5 + Math.random() * 2.0);
            w.vy = (Math.random() - 0.5) * 0.3;
            w.life = 0.2 + Math.random() * 0.15;
            w.maxLife = w.life;
            w.mesh.material.opacity = 0.4;
        }
    },
    _emitFeather(x, y) {
        var f = this._feathers[this._featherIdx % this._feathers.length];
        this._featherIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(x + (Math.random() - 0.5) * 0.08, y + (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.04);
        f.vx = (Math.random() - 0.5) * 0.4;
        f.vy = -0.1 + Math.random() * 0.2;
        f.vz = (Math.random() - 0.5) * 0.1;
        f.rv = (Math.random() - 0.5) * 5;
        f.drift = (Math.random() - 0.5) * 2;
        f.life = 1.5 + Math.random() * 1.0;
        f.maxLife = f.life;
        f.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.06) {
            // Scene appears
            var t = progress / 0.06;
            this._sky.material.opacity = t * 0.06;
            this._ground.material.opacity = t * 0.2;
            model.position.set(orig.x, orig.y, orig.z);
        } else if (progress < 0.25) {
            // Rise high: model ascends
            var t2 = (progress - 0.06) / 0.19;
            var riseEased = 1 - Math.pow(1 - t2, 2);
            var riseY = orig.y + riseEased * 0.5;

            model.position.set(orig.x, riseY, orig.z);
            model.rotation.z = 0;
            // Slight stretch upward
            model.scale.set(gs * (1 - riseEased * 0.05), gs * (1 + riseEased * 0.08), gs);

            this._sky.material.opacity = 0.06;
            this._ground.material.opacity = 0.2;

            // Wind during rise
            if (time - this._lastWind > 0.08 && t2 > 0.3) {
                this._emitWind(orig.x, riseY, -1);
                this._lastWind = time;
            }
        } else if (progress < 0.35) {
            // Pause at apex: moment of stillness
            var t3 = (progress - 0.25) / 0.10;
            var apexY = orig.y + 0.5;

            model.position.set(orig.x, apexY, orig.z);
            model.rotation.z = 0;
            model.scale.set(gs * 0.95, gs * 1.08, gs);

            // Apex glow
            this._apexGlow.visible = true;
            this._apexGlow.position.set(orig.x, apexY, 0);
            this._apexGlow.material.opacity = Math.sin(t3 * Math.PI) * 0.2;
        } else if (progress < 0.58) {
            // SWOOP! Fast downward arc
            var t4 = (progress - 0.35) / 0.23;
            var swoopEased = t4 * t4; // Accelerating down

            // Arc path: forward and down
            var swoopX = orig.x + Math.sin(t4 * Math.PI * 0.5) * 0.4;
            var swoopY = orig.y + 0.5 - swoopEased * 0.7;

            model.position.set(swoopX, swoopY, orig.z);

            // Speed stretch on descent (elongate diagonally)
            var stretchAmt = Math.min(swoopEased * 2, 1.0);
            model.scale.set(gs * (1 + stretchAmt * 0.15), gs * (1 - stretchAmt * 0.1), gs);

            // Tilt into dive
            model.rotation.z = -stretchAmt * 0.5;

            this._apexGlow.visible = false;

            // Heavy wind during dive
            if (time - this._lastWind > 0.03) {
                this._emitWind(swoopX, swoopY, -1);
                this._lastWind = time;
            }

            // Feathers shed
            if (time - this._lastFeather > 0.08 && t4 > 0.2) {
                this._emitFeather(swoopX, swoopY);
                this._lastFeather = time;
            }
        } else if (progress < 0.70) {
            // Pull up near ground: dramatic recovery
            var t5 = (progress - 0.58) / 0.12;
            var pullEased = t5 * t5 * (3 - 2 * t5); // Smooth step

            // Near-ground path curving back up
            var nearGroundY = orig.y - 0.2 + 0.02;
            var recoveryX = orig.x + 0.4 - t5 * 0.1;
            var recoveryY = nearGroundY + pullEased * 0.35;

            model.position.set(recoveryX, recoveryY, orig.z);

            // Transition from dive stretch to normal
            var destretch = pullEased;
            model.scale.set(gs * (1.15 - destretch * 0.15), gs * (0.9 + destretch * 0.1), gs);

            // Rotation recovery
            model.rotation.z = -0.5 * (1 - pullEased);

            // Wind during pull-up
            if (time - this._lastWind > 0.04) {
                this._emitWind(recoveryX, recoveryY, 1);
                this._lastWind = time;
            }

            // Last feathers
            if (t5 < 0.3 && time - this._lastFeather > 0.1) {
                this._emitFeather(recoveryX, recoveryY);
                this._lastFeather = time;
            }
        } else if (progress < 0.85) {
            // Majestic recovery climb
            var t6 = (progress - 0.70) / 0.15;
            var climbX = orig.x + 0.3 * (1 - t6);
            var climbY = orig.y + 0.15 + Math.sin(t6 * Math.PI * 0.5) * 0.15;

            model.position.set(climbX, climbY, orig.z);
            model.rotation.z = t6 * 0.05;
            model.scale.set(gs * (1 + (1 - t6) * 0.03), gs * (1 + (1 - t6) * 0.03), gs);

            // Gentle wind
            if (time - this._lastWind > 0.1) {
                this._emitWind(climbX, climbY, -1);
                this._lastWind = time;
            }
        } else {
            // Settle back to origin
            var t7 = (progress - 0.85) / 0.15;
            var settleY = orig.y + 0.15 * (1 - t7);
            model.position.set(orig.x, orig.y + Math.max(0, settleY - orig.y) * (1 - t7), orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._sky.material.opacity = 0.06 * (1 - t7);
            this._ground.material.opacity = 0.2 * (1 - t7);

            if (t7 > 0.8) {
                model.position.copy(orig);
            }
        }

        // Update wind
        for (var wi = 0; wi < this._wind.length; wi++) {
            var wp = this._wind[wi];
            if (wp.life <= 0) continue;
            wp.life -= delta;
            if (wp.life <= 0) { wp.mesh.visible = false; continue; }
            wp.mesh.position.x += wp.vx * delta;
            wp.mesh.position.y += wp.vy * delta;
            wp.mesh.material.opacity = 0.4 * (wp.life / wp.maxLife);
        }

        // Update feathers (flutter down)
        for (var fi = 0; fi < this._feathers.length; fi++) {
            var fp = this._feathers[fi];
            if (fp.life <= 0) continue;
            fp.life -= delta;
            if (fp.life <= 0) { fp.mesh.visible = false; continue; }
            fp.mesh.position.x += (fp.vx + Math.sin(time * fp.drift) * 0.1) * delta;
            fp.mesh.position.y += fp.vy * delta;
            fp.mesh.position.z += fp.vz * delta;
            fp.vy -= 0.15 * delta;
            // Flutter
            fp.mesh.rotation.z += fp.rv * delta;
            fp.mesh.rotation.x = Math.sin(time * 3 + fi) * 0.5;
            fp.mesh.material.opacity = 0.7 * (fp.life / fp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._wind) {
            this._wind.forEach(function(w) {
                scene.remove(w.mesh);
                w.mesh.geometry.dispose();
                w.mesh.material.dispose();
            });
        }
        if (this._feathers) {
            this._feathers.forEach(function(f) {
                scene.remove(f.mesh);
                f.mesh.geometry.dispose();
                f.mesh.material.dispose();
            });
        }
        if (this._sky) {
            scene.remove(this._sky);
            this._sky.geometry.dispose();
            this._sky.material.dispose();
        }
        if (this._ground) {
            scene.remove(this._ground);
            this._ground.geometry.dispose();
            this._ground.material.dispose();
        }
        if (this._apexGlow) {
            scene.remove(this._apexGlow);
            this._apexGlow.geometry.dispose();
            this._apexGlow.material.dispose();
        }
        this._wind = this._feathers = this._sky = this._ground = this._apexGlow = null;
    }
};
