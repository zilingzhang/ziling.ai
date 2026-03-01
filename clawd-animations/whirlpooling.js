export default {
    name: 'Whirlpooling',
    label: 'whirlpooling',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Vortex funnel particles (spiral inward and downward)
        this._vortexParts = [];
        var vpGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var i = 0; i < 60; i++) {
            var vpColors = [0x2266aa, 0x3388cc, 0x44aadd, 0x1155aa, 0x5599cc, 0x2277bb];
            var vpMat = new THREE.MeshBasicMaterial({
                color: vpColors[i % vpColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var vp = new THREE.Mesh(vpGeo, vpMat);
            scene.add(vp);
            // Distributed in a funnel shape
            var angle = (i / 60) * Math.PI * 6;
            var vertPos = (i / 60);
            var radius = 0.5 * (1 - vertPos * 0.7);
            this._vortexParts.push({
                mesh: vp,
                angle: angle,
                radius: radius,
                vertPos: vertPos,
                speed: 2.0 + Math.random() * 1.5,
                baseY: oy + 0.3 - vertPos * 0.6
            });
        }

        // Debris particles (caught in current)
        this._debris = [];
        var debGeo = new THREE.PlaneGeometry(0.02, 0.02);
        for (var j = 0; j < 15; j++) {
            var dColors = [0x334466, 0x445577, 0x556688, 0x223355];
            var dMat = new THREE.MeshBasicMaterial({
                color: dColors[j % dColors.length], transparent: true, opacity: 0,
                depthWrite: false, side: THREE.DoubleSide
            });
            var deb = new THREE.Mesh(debGeo, dMat);
            deb.visible = false;
            scene.add(deb);
            this._debris.push({
                mesh: deb,
                angle: Math.random() * Math.PI * 2,
                radius: 0.2 + Math.random() * 0.3,
                speed: 1.5 + Math.random() * 2.0,
                vertPos: Math.random(),
                rx: (Math.random() - 0.5) * 6,
                ry: (Math.random() - 0.5) * 6
            });
        }

        // Geyser ejection particles
        this._geyserParts = [];
        var gGeo = new THREE.SphereGeometry(0.018, 6, 6);
        for (var k = 0; k < 25; k++) {
            var gColors = [0x44bbee, 0x66ddff, 0x88eeff, 0x33aadd, 0xaaeeff];
            var gMat = new THREE.MeshBasicMaterial({
                color: gColors[k % gColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var gp = new THREE.Mesh(gGeo, gMat);
            gp.visible = false;
            scene.add(gp);
            this._geyserParts.push({ mesh: gp, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._geyserIdx = 0;

        // Whirlpool center glow
        var centerGeo = new THREE.SphereGeometry(0.08, 8, 8);
        var centerMat = new THREE.MeshBasicMaterial({
            color: 0x113355, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._center = new THREE.Mesh(centerGeo, centerMat);
        this._center.position.set(ox, oy - 0.2, 0);
        scene.add(this._center);

        this._geyserDone = false;
        this._modelAngle = Math.PI * 0.5;
    },
    _emitGeyser(x, y) {
        for (var i = 0; i < 15; i++) {
            var g = this._geyserParts[this._geyserIdx % this._geyserParts.length];
            this._geyserIdx++;
            g.mesh.visible = true;
            g.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0);
            g.vx = (Math.random() - 0.5) * 2.0;
            g.vy = 3.0 + Math.random() * 3.0;
            g.vz = (Math.random() - 0.5) * 1.5;
            g.life = 0.6 + Math.random() * 0.5;
            g.maxLife = g.life;
            g.mesh.material.opacity = 0.9;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Vortex particles appear
            var t = progress / 0.08;
            for (var vi = 0; vi < this._vortexParts.length; vi++) {
                this._vortexParts[vi].mesh.material.opacity = t * 0.5;
            }
            model.position.set(ox, oy + 0.3, oz);
        } else if (progress < 0.50) {
            // Phase 2: Spiral forms, model caught in current
            var t2 = (progress - 0.08) / 0.42;

            // Model orbits faster, descends
            var modelSpeed = 2.0 + t2 * 4.0;
            this._modelAngle += delta * modelSpeed;
            var modelR = 0.4 - t2 * 0.3;
            var modelY = oy + 0.3 - t2 * 0.4;

            model.position.set(
                ox + Math.cos(this._modelAngle) * modelR,
                modelY,
                Math.sin(this._modelAngle) * modelR * 0.3
            );
            model.rotation.z = Math.sin(this._modelAngle) * 0.15;

            // Vortex particles spin
            for (var vj = 0; vj < this._vortexParts.length; vj++) {
                var vp = this._vortexParts[vj];
                vp.angle += delta * vp.speed * (1 + t2 * 2);
                var vr = vp.radius * (1 - t2 * 0.3);
                vp.mesh.position.set(
                    ox + Math.cos(vp.angle) * vr,
                    vp.baseY + Math.sin(time * 2 + vj) * 0.02,
                    Math.sin(vp.angle) * vr * 0.3
                );
                vp.mesh.material.opacity = 0.5 + Math.sin(vp.angle) * 0.15;
            }

            // Debris caught
            for (var di = 0; di < this._debris.length; di++) {
                var db = this._debris[di];
                if (t2 > di * 0.05) {
                    db.mesh.visible = true;
                    db.angle += delta * db.speed * (1 + t2 * 1.5);
                    var dr = db.radius * (1 - t2 * 0.4);
                    var dy = oy + 0.3 - db.vertPos * 0.5 - t2 * 0.15;
                    db.mesh.position.set(
                        ox + Math.cos(db.angle) * dr,
                        dy,
                        Math.sin(db.angle) * dr * 0.3
                    );
                    db.mesh.rotation.x += db.rx * delta;
                    db.mesh.rotation.y += db.ry * delta;
                    db.mesh.material.opacity = 0.5;
                }
            }

            // Center glow intensifies
            this._center.material.opacity = t2 * 0.3;
            this._center.scale.setScalar(1 + Math.sin(time * 4) * 0.15);
        } else if (progress < 0.65) {
            // Phase 3: Maximum suction at center, funnel tightens
            var t3 = (progress - 0.50) / 0.15;

            this._modelAngle += delta * 8.0;
            var mR3 = 0.1 - t3 * 0.08;
            var mY3 = oy - 0.1 - t3 * 0.1;

            model.position.set(
                ox + Math.cos(this._modelAngle) * mR3,
                mY3,
                Math.sin(this._modelAngle) * mR3 * 0.3
            );
            model.rotation.z = this._modelAngle * 0.3;
            model.scale.set(
                this._origScale.x * (1 - t3 * 0.2),
                this._origScale.y * (1 + t3 * 0.2),
                this._origScale.z
            );

            // Vortex tightens
            for (var vk = 0; vk < this._vortexParts.length; vk++) {
                var vp2 = this._vortexParts[vk];
                vp2.angle += delta * vp2.speed * 4;
                var vr2 = vp2.radius * (0.7 - t3 * 0.4);
                vp2.mesh.position.set(
                    ox + Math.cos(vp2.angle) * vr2,
                    vp2.baseY - t3 * 0.15,
                    Math.sin(vp2.angle) * vr2 * 0.3
                );
                vp2.mesh.material.opacity = 0.6;
            }

            this._center.material.opacity = 0.3 + t3 * 0.3;
            this._center.scale.setScalar(1 + t3 * 0.5);

            // Debris converges
            for (var dj = 0; dj < this._debris.length; dj++) {
                var db2 = this._debris[dj];
                db2.angle += delta * db2.speed * 3;
                var dr2 = db2.radius * (0.6 - t3 * 0.5);
                db2.mesh.position.set(
                    ox + Math.cos(db2.angle) * dr2,
                    oy - 0.1 - t3 * 0.1,
                    Math.sin(db2.angle) * dr2 * 0.3
                );
            }
        } else if (progress < 0.78) {
            // Phase 4: Expelled upward! Geyser
            var t4 = (progress - 0.65) / 0.13;

            if (!this._geyserDone) {
                this._emitGeyser(ox, oy - 0.2);
                this._geyserDone = true;
            }

            // Model shoots upward
            var ejectY = oy - 0.2 + t4 * 0.7;
            model.position.set(ox + Math.sin(t4 * Math.PI * 4) * 0.05, ejectY, oz);
            model.rotation.z = t4 * Math.PI * 2;
            model.scale.copy(this._origScale);

            // Vortex dissipates
            for (var vl = 0; vl < this._vortexParts.length; vl++) {
                this._vortexParts[vl].mesh.material.opacity = 0.6 * (1 - t4);
            }
            this._center.material.opacity = 0.6 * (1 - t4);

            for (var dk = 0; dk < this._debris.length; dk++) {
                this._debris[dk].mesh.material.opacity = 0.5 * (1 - t4);
            }
        } else {
            // Phase 5: Settle and fade
            var t5 = (progress - 0.78) / 0.22;

            model.position.set(ox, oy + 0.5 * (1 - t5), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var vm = 0; vm < this._vortexParts.length; vm++) {
                this._vortexParts[vm].mesh.material.opacity = 0;
            }
            this._center.material.opacity = 0;
            for (var dl = 0; dl < this._debris.length; dl++) {
                this._debris[dl].mesh.visible = false;
            }
        }

        // Update geyser particles
        for (var gi = 0; gi < this._geyserParts.length; gi++) {
            var gp = this._geyserParts[gi];
            if (gp.life <= 0) continue;
            gp.life -= delta;
            if (gp.life <= 0) { gp.mesh.visible = false; continue; }
            gp.mesh.position.x += gp.vx * delta;
            gp.mesh.position.y += gp.vy * delta;
            gp.mesh.position.z += gp.vz * delta;
            gp.vy -= 4 * delta;
            gp.mesh.material.opacity = 0.9 * (gp.life / gp.maxLife);
            gp.mesh.scale.setScalar(0.5 + 0.5 * (1 - gp.life / gp.maxLife));
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._vortexParts) {
            this._vortexParts.forEach(function(v) { scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh.material.dispose(); });
        }
        if (this._debris) {
            this._debris.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); });
        }
        if (this._geyserParts) {
            this._geyserParts.forEach(function(g) { scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); });
        }
        if (this._center) { scene.remove(this._center); this._center.geometry.dispose(); this._center.material.dispose(); }
        this._vortexParts = this._debris = this._geyserParts = this._center = null;
    }
};
