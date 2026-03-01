export default {
    name: 'Transmuting',
    label: 'transmuting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x, oy = this._origPos.y;

        // Transforming sphere (starts dark gray, transitions to gold)
        var sphereGeo = new THREE.SphereGeometry(0.14, 16, 16);
        var sphereMat = new THREE.MeshBasicMaterial({
            color: 0x555555, transparent: true, opacity: 0
        });
        this._sphere = new THREE.Mesh(sphereGeo, sphereMat);
        this._sphere.position.set(ox, oy + 0.1, 0);
        this._sphere.scale.set(0, 0, 0);
        scene.add(this._sphere);

        // Alchemy circle torus (flat ring beneath sphere)
        var circleGeo = new THREE.TorusGeometry(0.45, 0.025, 12, 48);
        var circleMat = new THREE.MeshBasicMaterial({
            color: 0xaa6622, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._circle = new THREE.Mesh(circleGeo, circleMat);
        this._circle.rotation.x = Math.PI / 2;
        this._circle.position.set(ox, oy - 0.25, 0);
        scene.add(this._circle);

        // 8 energy stream line segments (spiral from circle to sphere)
        this._streams = [];
        var streamGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4);
        for (var i = 0; i < 8; i++) {
            var stMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xffaa22 : 0xddcc44,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var stream = new THREE.Mesh(streamGeo, stMat);
            stream.visible = false;
            scene.add(stream);
            this._streams.push({
                mesh: stream,
                angle: (i / 8) * Math.PI * 2,
                speed: 1.5 + (i % 3) * 0.5
            });
        }

        // 20 transformation particles
        this._particles = [];
        var pGeo = new THREE.SphereGeometry(0.02, 4, 4);
        for (var j = 0; j < 20; j++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: 0xffcc44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var p = new THREE.Mesh(pGeo, pMat);
            p.visible = false;
            scene.add(p);
            this._particles.push({
                mesh: p, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._pIdx = 0;

        // Stage-transition flash rings (3 total for gray->silver->gold)
        this._flashes = [];
        for (var f = 0; f < 3; f++) {
            var fGeo = new THREE.TorusGeometry(0.2, 0.06, 8, 24);
            var fColors = [0x888888, 0xcccccc, 0xffdd44];
            var fMat = new THREE.MeshBasicMaterial({
                color: fColors[f], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var flash = new THREE.Mesh(fGeo, fMat);
            flash.position.set(ox, oy + 0.1, 0);
            flash.rotation.x = Math.PI / 2;
            flash.scale.set(0, 0, 0);
            scene.add(flash);
            this._flashes.push(flash);
        }
    },
    _burstParticles(x, y, color) {
        for (var i = 0; i < 5; i++) {
            var p = this._particles[this._pIdx % this._particles.length];
            this._pIdx++;
            p.mesh.visible = true;
            p.mesh.position.set(x, y, 0);
            p.mesh.material.color.setHex(color);
            var angle = Math.random() * Math.PI * 2;
            var spd = 1.0 + Math.random() * 2.0;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.vz = (Math.random() - 0.5) * 1.0;
            p.life = 0.4 + Math.random() * 0.4;
            p.maxLife = p.life;
            p.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x, oy = this._origPos.y, oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Lead sphere + circle appear
            var t = progress / 0.10;
            var ease = 1 - Math.pow(1 - t, 3);

            this._sphere.scale.setScalar(ease);
            this._sphere.material.opacity = ease * 0.9;
            this._sphere.material.color.setHex(0x555555);

            this._circle.material.opacity = ease * 0.6;
            this._circle.scale.setScalar(ease);
            this._circle.rotation.z = time * 0.5;
        } else if (progress < 0.35) {
            // Phase 2: Energy streams begin, sphere shifts to silver
            var t2 = (progress - 0.10) / 0.25;

            this._circle.rotation.z = time * 1.5;
            this._circle.material.opacity = 0.6 + Math.sin(time * 4) * 0.1;

            // Sphere color: gray to silver
            var grayR = 0.33, grayG = 0.33, grayB = 0.33;
            var silverR = 0.8, silverG = 0.8, silverB = 0.85;
            var cr = grayR + (silverR - grayR) * t2;
            var cg = grayG + (silverG - grayG) * t2;
            var cb = grayB + (silverB - grayB) * t2;
            this._sphere.material.color.setRGB(cr, cg, cb);
            this._sphere.scale.setScalar(1.0 + Math.sin(time * 3) * 0.05);

            // Energy streams spiral
            for (var i = 0; i < this._streams.length; i++) {
                var st = this._streams[i];
                var streamT = Math.min(t2 * 2, 1);
                st.mesh.visible = streamT > 0;
                st.mesh.material.opacity = streamT * 0.5;
                var a = st.angle + time * st.speed;
                var r = 0.35 * (1 - t2 * 0.3);
                st.mesh.position.set(
                    ox + Math.cos(a) * r,
                    oy - 0.1 + Math.sin(a) * 0.15,
                    Math.sin(a) * r * 0.3
                );
                st.mesh.rotation.z = a + Math.PI / 4;
                st.mesh.scale.y = streamT * (0.5 + Math.sin(time * 5 + i) * 0.2);
            }

            // Silver flash at end
            if (t2 > 0.85 && this._flashes[0].material.opacity < 0.01) {
                this._burstParticles(ox, oy + 0.1, 0xcccccc);
            }
            if (t2 > 0.85) {
                var flashT = (t2 - 0.85) / 0.15;
                this._flashes[0].scale.setScalar(flashT * 2.0);
                this._flashes[0].material.opacity = (1 - flashT) * 0.7;
            }
        } else if (progress < 0.60) {
            // Phase 3: Intense streams, silver to gold transition
            var t3 = (progress - 0.35) / 0.25;

            this._circle.rotation.z = time * 2.0;
            this._circle.material.opacity = 0.6 + Math.sin(time * 6) * 0.15;
            this._circle.material.color.setHex(t3 < 0.5 ? 0xaa6622 : 0xddaa22);

            // Sphere color: silver to gold
            var sR = 0.8, sG = 0.8, sB = 0.85;
            var goldR = 1.0, goldG = 0.85, goldB = 0.2;
            this._sphere.material.color.setRGB(
                sR + (goldR - sR) * t3,
                sG + (goldG - sG) * t3,
                sB + (goldB - sB) * t3
            );
            this._sphere.scale.setScalar(1.0 + Math.sin(time * 4) * 0.08);

            // Streams intensify
            for (var i2 = 0; i2 < this._streams.length; i2++) {
                var st2 = this._streams[i2];
                st2.mesh.material.opacity = 0.5 + t3 * 0.3;
                var a2 = st2.angle + time * st2.speed * 1.5;
                var r2 = 0.25 * (1 - t3 * 0.4);
                st2.mesh.position.set(
                    ox + Math.cos(a2) * r2,
                    oy - 0.1 + Math.sin(a2) * 0.15,
                    Math.sin(a2) * r2 * 0.3
                );
                st2.mesh.rotation.z = a2 + Math.PI / 4;
                st2.mesh.scale.y = 0.8 + Math.sin(time * 6 + i2) * 0.3;
            }

            // Gold flash at end
            if (t3 > 0.85 && this._flashes[1].material.opacity < 0.01) {
                this._burstParticles(ox, oy + 0.1, 0xffdd44);
            }
            if (t3 > 0.85) {
                var flashT2 = (t3 - 0.85) / 0.15;
                this._flashes[1].scale.setScalar(flashT2 * 2.0);
                this._flashes[1].material.opacity = (1 - flashT2) * 0.7;
            }

            model.position.set(ox, oy + Math.sin(time * 2) * 0.02, oz);
        } else if (progress < 0.78) {
            // Phase 4: Gold achieved, burst of golden particles
            var t4 = (progress - 0.60) / 0.18;

            this._sphere.material.color.setRGB(1.0, 0.85, 0.2);
            this._sphere.scale.setScalar(1.0 + Math.sin(time * 6) * 0.1);
            this._sphere.material.opacity = 0.9;

            // Big golden flash
            if (t4 < 0.3) {
                var flashT3 = t4 / 0.3;
                this._flashes[2].scale.setScalar(flashT3 * 3.0);
                this._flashes[2].material.opacity = (1 - flashT3) * 0.9;
                if (t4 < 0.05) {
                    this._burstParticles(ox, oy + 0.1, 0xffdd44);
                    this._burstParticles(ox, oy + 0.1, 0xffee88);
                }
            } else {
                this._flashes[2].material.opacity = 0;
            }

            // Streams fade
            for (var i3 = 0; i3 < this._streams.length; i3++) {
                this._streams[i3].mesh.material.opacity = 0.8 * (1 - t4);
            }

            this._circle.rotation.z = time * 2.5;
            this._circle.material.opacity = 0.6 * (1 - t4 * 0.5);

            model.position.set(ox, oy + Math.sin(time * 2) * 0.03, oz);
        } else if (progress < 0.90) {
            // Phase 5: Golden sphere pulses triumphantly
            var t5 = (progress - 0.78) / 0.12;

            this._sphere.material.color.setRGB(1.0, 0.85 + Math.sin(time * 8) * 0.1, 0.2);
            this._sphere.scale.setScalar(1.0 + Math.sin(time * 8) * 0.12);
            this._sphere.material.opacity = 0.9;

            this._circle.material.opacity = 0.3 * (1 - t5);
            for (var i4 = 0; i4 < this._streams.length; i4++) {
                this._streams[i4].mesh.visible = false;
            }

            model.position.copy(this._origPos);
        } else {
            // Phase 6: Fade
            var t6 = (progress - 0.90) / 0.10;

            this._sphere.material.opacity = 0.9 * (1 - t6);
            this._sphere.scale.setScalar(1.0 + t6 * 0.5);
            this._circle.material.opacity = 0;

            model.position.copy(this._origPos);
            model.rotation.z = 0;
        }

        // Update particles
        for (var pi = 0; pi < this._particles.length; pi++) {
            var pp = this._particles[pi];
            if (pp.life <= 0) continue;
            pp.life -= delta;
            if (pp.life <= 0) { pp.mesh.visible = false; continue; }
            pp.mesh.position.x += pp.vx * delta;
            pp.mesh.position.y += pp.vy * delta;
            pp.mesh.position.z += pp.vz * delta;
            pp.vy -= 2.0 * delta;
            var lr = pp.life / pp.maxLife;
            pp.mesh.material.opacity = lr;
            pp.mesh.scale.setScalar(0.3 + 0.7 * lr);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._sphere) { scene.remove(this._sphere); this._sphere.geometry.dispose(); this._sphere.material.dispose(); }
        if (this._circle) { scene.remove(this._circle); this._circle.geometry.dispose(); this._circle.material.dispose(); }
        if (this._streams) { this._streams.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._particles) { this._particles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._flashes) { this._flashes.forEach(function(f) { scene.remove(f); f.geometry.dispose(); f.material.dispose(); }); }
        this._sphere = this._circle = this._streams = this._particles = this._flashes = null;
    }
};
