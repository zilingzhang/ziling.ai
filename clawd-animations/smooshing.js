export default {
    name: 'Smooshing',
    label: 'smooshing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Left object (sphere)
        var leftGeo = new THREE.SphereGeometry(0.12, 12, 12);
        var leftMat = new THREE.MeshBasicMaterial({
            color: 0xff6688, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._leftObj = new THREE.Mesh(leftGeo, leftMat);
        this._leftObj.position.set(ox - 0.6, oy, 0);
        scene.add(this._leftObj);

        // Right object (cube)
        var rightGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        var rightMat = new THREE.MeshBasicMaterial({
            color: 0x6688ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._rightObj = new THREE.Mesh(rightGeo, rightMat);
        this._rightObj.position.set(ox + 0.6, oy, 0);
        scene.add(this._rightObj);

        // Merged hybrid shape (dodecahedron)
        var mergedGeo = new THREE.DodecahedronGeometry(0.15, 0);
        var mergedMat = new THREE.MeshBasicMaterial({
            color: 0xbb77dd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._merged = new THREE.Mesh(mergedGeo, mergedMat);
        this._merged.position.set(ox, oy, 0);
        this._merged.visible = false;
        scene.add(this._merged);

        // Compression particles (spray outward)
        this._compParts = [];
        var compGeo = new THREE.SphereGeometry(0.012, 4, 4);
        var compColors = [0xff88aa, 0x88aaff, 0xcc88dd, 0xffaacc, 0xaaccff, 0xddaaff];
        for (var i = 0; i < 35; i++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: compColors[i % compColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cp = new THREE.Mesh(compGeo, cMat);
            cp.visible = false;
            scene.add(cp);
            this._compParts.push({ mesh: cp, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._compIdx = 0;

        // Ejection particles (excess matter flying off)
        this._ejectParts = [];
        var ejectGeo = new THREE.PlaneGeometry(0.025, 0.025);
        for (var j = 0; j < 20; j++) {
            var eColors = [0xff6688, 0x6688ff, 0xbb77dd, 0xffaa88, 0x88aaff];
            var eMat = new THREE.MeshBasicMaterial({
                color: eColors[j % eColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var ep = new THREE.Mesh(ejectGeo, eMat);
            ep.visible = false;
            scene.add(ep);
            this._ejectParts.push({ mesh: ep, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0 });
        }
        this._ejectIdx = 0;

        // Squish glow
        var squishGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var squishMat = new THREE.MeshBasicMaterial({
            color: 0xddaaff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._squishGlow = new THREE.Mesh(squishGeo, squishMat);
        this._squishGlow.position.set(ox, oy, -0.01);
        scene.add(this._squishGlow);

        this._lastComp = 0;
        this._ejectDone = false;
    },
    _emitCompression(x, y) {
        for (var i = 0; i < 4; i++) {
            var c = this._compParts[this._compIdx % this._compParts.length];
            this._compIdx++;
            c.mesh.visible = true;
            c.mesh.position.set(x, y + (Math.random() - 0.5) * 0.1, 0);
            // Spray perpendicular to compression axis (up/down)
            c.vx = (Math.random() - 0.5) * 0.5;
            c.vy = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2.0);
            c.vz = (Math.random() - 0.5) * 1.5;
            c.life = 0.3 + Math.random() * 0.3;
            c.maxLife = c.life;
            c.mesh.material.opacity = 0.8;
        }
    },
    _emitEjection(x, y) {
        for (var i = 0; i < 12; i++) {
            var e = this._ejectParts[this._ejectIdx % this._ejectParts.length];
            this._ejectIdx++;
            e.mesh.visible = true;
            e.mesh.position.set(x, y, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 2.0 + Math.random() * 3.0;
            e.vx = Math.cos(a) * spd;
            e.vy = Math.sin(a) * spd;
            e.vz = (Math.random() - 0.5) * 2.0;
            e.rx = (Math.random() - 0.5) * 10;
            e.ry = (Math.random() - 0.5) * 10;
            e.life = 0.5 + Math.random() * 0.4;
            e.maxLife = e.life;
            e.mesh.material.opacity = 0.9;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var gs = this._origScale.x;

        if (progress < 0.08) {
            // Phase 1: Objects appear on either side
            var t = progress / 0.08;
            this._leftObj.material.opacity = t * 0.7;
            this._rightObj.material.opacity = t * 0.7;
            model.position.set(ox, oy, orig.z);
        } else if (progress < 0.30) {
            // Phase 2: Objects approach, model in middle pushing
            var t2 = (progress - 0.08) / 0.22;
            var approachDist = 0.6 - t2 * 0.4;

            this._leftObj.position.set(ox - approachDist, oy, 0);
            this._rightObj.position.set(ox + approachDist, oy, 0);

            // Model pushing stance
            model.position.set(ox, oy, orig.z);
            model.scale.set(gs * (1 + t2 * 0.08), gs * (1 - t2 * 0.05), gs);
            model.rotation.z = Math.sin(time * 4) * 0.03;

            this._leftObj.material.opacity = 0.7;
            this._rightObj.material.opacity = 0.7;
        } else if (progress < 0.55) {
            // Phase 3: Compression! Objects squish, particles spray
            var t3 = (progress - 0.30) / 0.25;
            var squeeze = 0.2 - t3 * 0.12;

            this._leftObj.position.set(ox - squeeze, oy, 0);
            this._rightObj.position.set(ox + squeeze, oy, 0);

            // Objects deform (scale squish)
            this._leftObj.scale.set(1 - t3 * 0.3, 1 + t3 * 0.2, 1 + t3 * 0.2);
            this._rightObj.scale.set(1 - t3 * 0.3, 1 + t3 * 0.2, 1 + t3 * 0.2);

            // Color blend toward purple
            var blendR = 0xff - Math.floor(t3 * 0x44);
            var blendB = 0x88 + Math.floor(t3 * 0x55);
            this._leftObj.material.color.setRGB(blendR / 255, 0.4 + t3 * 0.1, blendB / 255);
            this._rightObj.material.color.setRGB(blendR / 255 * 0.6, 0.4 + t3 * 0.1, blendB / 255);

            // Model pushes hard
            model.position.set(ox, oy - t3 * 0.02, orig.z);
            model.scale.set(gs * 1.08, gs * 0.93, gs);
            model.rotation.z = Math.sin(time * 6) * 0.04;

            // Squish glow builds
            this._squishGlow.material.opacity = t3 * 0.25;

            // Compression particles
            if (time - this._lastComp > 0.06) {
                this._emitCompression(ox, oy);
                this._lastComp = time;
            }
        } else if (progress < 0.70) {
            // Phase 4: Merge into hybrid shape
            var t4 = (progress - 0.55) / 0.15;

            // Objects fade, merged appears
            this._leftObj.material.opacity = 0.7 * (1 - t4);
            this._rightObj.material.opacity = 0.7 * (1 - t4);
            this._leftObj.position.set(ox - 0.08 * (1 - t4), oy, 0);
            this._rightObj.position.set(ox + 0.08 * (1 - t4), oy, 0);

            this._merged.visible = true;
            this._merged.material.opacity = t4 * 0.8;
            this._merged.scale.setScalar(t4);
            this._merged.rotation.y = time * 2;

            // Ejection burst
            if (!this._ejectDone && t4 > 0.3) {
                this._emitEjection(ox, oy);
                this._ejectDone = true;
            }

            this._squishGlow.material.opacity = 0.25 * (1 - t4 * 0.5);

            model.position.set(ox, oy, orig.z);
            model.scale.copy(this._origScale);
            model.rotation.z = 0;
        } else if (progress < 0.88) {
            // Phase 5: New unified form spins proudly
            var t5 = (progress - 0.70) / 0.18;

            this._leftObj.visible = false;
            this._rightObj.visible = false;

            this._merged.material.opacity = 0.8;
            this._merged.rotation.y = time * 2;
            this._merged.rotation.x = Math.sin(time * 1.5) * 0.2;
            this._merged.scale.setScalar(1 + Math.sin(time * 3) * 0.08);

            this._squishGlow.material.opacity = 0.1 + Math.sin(time * 2) * 0.05;

            model.position.set(ox + 0.25, oy, orig.z);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;

            this._merged.material.opacity = 0.8 * (1 - t6);
            this._squishGlow.material.opacity = 0.1 * (1 - t6);

            model.position.set(ox + 0.25 * (1 - t6), oy, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update compression particles
        for (var ci = 0; ci < this._compParts.length; ci++) {
            var cp = this._compParts[ci];
            if (cp.life <= 0) continue;
            cp.life -= delta;
            if (cp.life <= 0) { cp.mesh.visible = false; continue; }
            cp.mesh.position.x += cp.vx * delta;
            cp.mesh.position.y += cp.vy * delta;
            cp.mesh.position.z += cp.vz * delta;
            cp.mesh.material.opacity = 0.8 * (cp.life / cp.maxLife);
        }

        // Update ejection particles
        for (var ei = 0; ei < this._ejectParts.length; ei++) {
            var ep = this._ejectParts[ei];
            if (ep.life <= 0) continue;
            ep.life -= delta;
            if (ep.life <= 0) { ep.mesh.visible = false; continue; }
            ep.mesh.position.x += ep.vx * delta;
            ep.mesh.position.y += ep.vy * delta;
            ep.mesh.position.z += ep.vz * delta;
            ep.vy -= 2 * delta;
            ep.mesh.rotation.x += ep.rx * delta;
            ep.mesh.rotation.y += ep.ry * delta;
            ep.mesh.material.opacity = 0.9 * (ep.life / ep.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._leftObj) { scene.remove(this._leftObj); this._leftObj.geometry.dispose(); this._leftObj.material.dispose(); }
        if (this._rightObj) { scene.remove(this._rightObj); this._rightObj.geometry.dispose(); this._rightObj.material.dispose(); }
        if (this._merged) { scene.remove(this._merged); this._merged.geometry.dispose(); this._merged.material.dispose(); }
        if (this._squishGlow) { scene.remove(this._squishGlow); this._squishGlow.geometry.dispose(); this._squishGlow.material.dispose(); }
        if (this._compParts) {
            this._compParts.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); });
        }
        if (this._ejectParts) {
            this._ejectParts.forEach(function(e) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); });
        }
        this._leftObj = this._rightObj = this._merged = this._squishGlow = this._compParts = this._ejectParts = null;
    }
};
