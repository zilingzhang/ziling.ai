export default {
    name: 'Frolicking',
    label: 'frolicking',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Flower particles at landing spots
        this._flowers = [];
        var petalGeo = new THREE.CircleGeometry(0.02, 6);
        for (var i = 0; i < 20; i++) {
            var fColors = [0xff88aa, 0xffaacc, 0xffcc44, 0xff66aa, 0xeedd55, 0xff99bb];
            var fMat = new THREE.MeshBasicMaterial({
                color: fColors[i % fColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var flower = new THREE.Mesh(petalGeo, fMat);
            flower.visible = false;
            scene.add(flower);
            this._flowers.push({ mesh: flower, life: 0, maxLife: 0, vy: 0, spin: 0 });
        }
        this._flowerIdx = 0;

        // Butterfly followers (small colored triangles)
        this._butterflies = [];
        var bflyGeo = new THREE.BufferGeometry();
        var bflyVerts = new Float32Array([0, 0.015, 0, -0.015, -0.01, 0, 0.015, -0.01, 0]);
        bflyGeo.setAttribute('position', new THREE.BufferAttribute(bflyVerts, 3));
        for (var b = 0; b < 4; b++) {
            var bColors = [0xff44aa, 0x44aaff, 0xffaa44, 0xaa44ff];
            var bMat = new THREE.MeshBasicMaterial({
                color: bColors[b], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var bfly = new THREE.Mesh(bflyGeo, bMat);
            bfly.visible = false;
            scene.add(bfly);
            this._butterflies.push({ mesh: bfly, offsetAngle: b * Math.PI / 2, dist: 0.2 + b * 0.05 });
        }

        // Grass blade lines (swaying)
        this._grass = [];
        var grassGeo = new THREE.BoxGeometry(0.006, 0.08, 0.003);
        for (var g = 0; g < 18; g++) {
            var gColors = [0x44bb44, 0x66cc44, 0x33aa33, 0x55dd55];
            var gMat = new THREE.MeshBasicMaterial({
                color: gColors[g % gColors.length], transparent: true, opacity: 0,
                depthWrite: false
            });
            var grass = new THREE.Mesh(grassGeo, gMat);
            var gAngle = (g / 18) * Math.PI * 2;
            var gRadius = 0.3 + Math.random() * 0.4;
            grass.position.set(
                this._origPos.x + Math.cos(gAngle) * gRadius,
                this._origPos.y - 0.16,
                Math.sin(gAngle) * gRadius * 0.5
            );
            grass.visible = false;
            scene.add(grass);
            this._grass.push({ mesh: grass, baseRotZ: (Math.random() - 0.5) * 0.3, phase: Math.random() * Math.PI * 2 });
        }

        // Sunshine glow from above
        var sunGeo = new THREE.SphereGeometry(0.15, 12, 12);
        var sunMat = new THREE.MeshBasicMaterial({
            color: 0xffee44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._sun = new THREE.Mesh(sunGeo, sunMat);
        this._sun.position.set(this._origPos.x + 0.3, this._origPos.y + 0.8, -0.2);
        scene.add(this._sun);

        // Sun rays
        this._rays = [];
        var rayGeo = new THREE.BoxGeometry(0.008, 0.3, 0.003);
        for (var r = 0; r < 6; r++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: 0xffee88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ray = new THREE.Mesh(rayGeo, rMat);
            ray.visible = false;
            scene.add(ray);
            this._rays.push({ mesh: ray, angle: (r / 6) * Math.PI * 2 });
        }

        this._lastFlower = 0;
    },
    _emitFlowers(x, y) {
        for (var i = 0; i < 3; i++) {
            var f = this._flowers[this._flowerIdx % this._flowers.length];
            this._flowerIdx++;
            f.mesh.visible = true;
            f.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y - 0.1, (Math.random() - 0.5) * 0.08);
            f.vy = 0.3 + Math.random() * 0.5;
            f.spin = (Math.random() - 0.5) * 6;
            f.life = 1.5 + Math.random() * 1.0;
            f.maxLife = f.life;
            f.mesh.material.opacity = 0.9;
            f.mesh.scale.setScalar(0.5 + Math.random() * 1.0);
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.08) {
            // Meadow appears: grass and sun fade in
            var t = progress / 0.08;
            for (var gi = 0; gi < this._grass.length; gi++) {
                this._grass[gi].mesh.visible = true;
                this._grass[gi].mesh.material.opacity = t * 0.5;
            }
            this._sun.material.opacity = t * 0.3;
            model.position.set(orig.x, orig.y, orig.z);
        } else if (progress < 0.30) {
            // First skip arc
            var t2 = (progress - 0.08) / 0.22;
            var skipX = orig.x - 0.4 + t2 * 0.8;
            var arcY = Math.sin(t2 * Math.PI) * 0.25;
            model.position.set(skipX, orig.y + arcY, orig.z);

            // Joyful rotation
            model.rotation.z = Math.sin(t2 * Math.PI * 3) * 0.1;

            // Stretch during flight, squash on landing
            if (arcY > 0.1) {
                model.scale.set(gs * 0.95, gs * 1.1, gs);
            } else {
                model.scale.set(gs * 1.05, gs * 0.92, gs);
            }

            // Flowers on landing
            if (t2 > 0.85 && time - this._lastFlower > 0.3) {
                this._emitFlowers(skipX, orig.y);
                this._lastFlower = time;
            }

            // Butterflies appear
            for (var bi = 0; bi < this._butterflies.length; bi++) {
                var bf = this._butterflies[bi];
                bf.mesh.visible = true;
                var bAngle = bf.offsetAngle + time * 2;
                bf.mesh.position.set(
                    skipX + Math.cos(bAngle) * bf.dist,
                    orig.y + 0.2 + Math.sin(time * 3 + bi) * 0.08,
                    Math.sin(bAngle) * bf.dist * 0.3
                );
                bf.mesh.rotation.y = bAngle;
                bf.mesh.material.opacity = t2 * 0.7;
            }

            // Sun rays
            for (var ri = 0; ri < this._rays.length; ri++) {
                var ray = this._rays[ri];
                ray.mesh.visible = true;
                var rAngle = ray.angle + time * 0.5;
                ray.mesh.position.copy(this._sun.position);
                ray.mesh.rotation.z = rAngle;
                ray.mesh.material.opacity = t2 * 0.15;
            }

            this._sun.material.opacity = 0.3 + Math.sin(time * 2) * 0.05;
        } else if (progress < 0.55) {
            // Multi-bounce skip sequence
            var t3 = (progress - 0.30) / 0.25;
            var bounceCount = 3;
            var bouncePhase = (t3 * bounceCount) % 1.0;
            var bounceIdx = Math.floor(t3 * bounceCount);

            var skipX2 = orig.x + 0.4 - t3 * 0.8;
            var bounceArc = Math.sin(bouncePhase * Math.PI) * (0.2 - bounceIdx * 0.02);
            model.position.set(skipX2, orig.y + Math.max(0, bounceArc), orig.z);

            model.rotation.z = Math.sin(time * 6) * 0.12;

            if (bounceArc > 0.05) {
                model.scale.set(gs * 0.93, gs * 1.08, gs);
            } else {
                model.scale.set(gs * 1.06, gs * 0.93, gs);
            }

            // Flowers at each landing
            if (bounceArc < 0.02 && time - this._lastFlower > 0.25) {
                this._emitFlowers(skipX2, orig.y);
                this._lastFlower = time;
            }

            // Butterflies follow
            for (var bi2 = 0; bi2 < this._butterflies.length; bi2++) {
                var bf2 = this._butterflies[bi2];
                var bAngle2 = bf2.offsetAngle + time * 2.5;
                bf2.mesh.position.set(
                    skipX2 + Math.cos(bAngle2) * bf2.dist,
                    orig.y + 0.2 + Math.sin(time * 3.5 + bi2) * 0.1,
                    Math.sin(bAngle2) * bf2.dist * 0.3
                );
                bf2.mesh.rotation.y = bAngle2;
                bf2.mesh.material.opacity = 0.7;
            }
        } else if (progress < 0.78) {
            // Joyful twirl
            var t4 = (progress - 0.55) / 0.23;
            var twirl = t4 * Math.PI * 4;
            var twirlBounce = Math.sin(t4 * Math.PI * 6) * 0.1;

            model.position.set(orig.x + Math.sin(twirl * 0.5) * 0.15, orig.y + Math.abs(twirlBounce) + 0.05, orig.z);
            model.rotation.z = twirl;
            model.scale.set(gs * (1 + Math.sin(t4 * Math.PI) * 0.08), gs * (1 + Math.sin(t4 * Math.PI) * 0.08), gs);

            // Flowers burst during twirl
            if (time - this._lastFlower > 0.1) {
                this._emitFlowers(model.position.x, orig.y);
                this._lastFlower = time;
            }

            // Butterflies spiral
            for (var bi3 = 0; bi3 < this._butterflies.length; bi3++) {
                var bf3 = this._butterflies[bi3];
                var bAngle3 = bf3.offsetAngle + time * 4;
                var bDist = bf3.dist + Math.sin(time * 2) * 0.05;
                bf3.mesh.position.set(
                    model.position.x + Math.cos(bAngle3) * bDist,
                    model.position.y + Math.sin(time * 4 + bi3) * 0.1,
                    Math.sin(bAngle3) * bDist * 0.3
                );
                bf3.mesh.material.opacity = 0.8;
            }
        } else {
            // Settle with fading meadow
            var t5 = (progress - 0.78) / 0.22;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            // Fade everything
            for (var gi2 = 0; gi2 < this._grass.length; gi2++) {
                this._grass[gi2].mesh.material.opacity = 0.5 * (1 - t5);
            }
            this._sun.material.opacity = 0.3 * (1 - t5);
            for (var ri2 = 0; ri2 < this._rays.length; ri2++) {
                this._rays[ri2].mesh.material.opacity = 0.15 * (1 - t5);
                if (t5 > 0.8) this._rays[ri2].mesh.visible = false;
            }
            for (var bi4 = 0; bi4 < this._butterflies.length; bi4++) {
                this._butterflies[bi4].mesh.material.opacity = 0.7 * (1 - t5);
                if (t5 > 0.8) this._butterflies[bi4].mesh.visible = false;
            }
        }

        // Sway grass
        for (var sg = 0; sg < this._grass.length; sg++) {
            var gr = this._grass[sg];
            if (gr.mesh.visible) {
                gr.mesh.rotation.z = gr.baseRotZ + Math.sin(time * 2 + gr.phase) * 0.15;
            }
        }

        // Update flower particles
        for (var fi = 0; fi < this._flowers.length; fi++) {
            var fp = this._flowers[fi];
            if (fp.life <= 0) continue;
            fp.life -= delta;
            if (fp.life <= 0) { fp.mesh.visible = false; continue; }
            fp.mesh.position.y += fp.vy * delta;
            fp.vy -= 0.3 * delta;
            fp.mesh.rotation.z += fp.spin * delta;
            fp.mesh.material.opacity = 0.9 * (fp.life / fp.maxLife);
        }

        // Sun ray rotation
        for (var sri = 0; sri < this._rays.length; sri++) {
            var sr = this._rays[sri];
            if (sr.mesh.visible) {
                sr.mesh.position.copy(this._sun.position);
                sr.mesh.rotation.z = sr.angle + time * 0.3;
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._flowers) {
            this._flowers.forEach(function(f) {
                scene.remove(f.mesh);
                f.mesh.geometry.dispose();
                f.mesh.material.dispose();
            });
        }
        if (this._butterflies) {
            this._butterflies.forEach(function(b) {
                scene.remove(b.mesh);
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
            });
        }
        if (this._grass) {
            this._grass.forEach(function(g) {
                scene.remove(g.mesh);
                g.mesh.geometry.dispose();
                g.mesh.material.dispose();
            });
        }
        if (this._sun) {
            scene.remove(this._sun);
            this._sun.geometry.dispose();
            this._sun.material.dispose();
        }
        if (this._rays) {
            this._rays.forEach(function(r) {
                scene.remove(r.mesh);
                r.mesh.geometry.dispose();
                r.mesh.material.dispose();
            });
        }
        this._flowers = this._butterflies = this._grass = this._sun = this._rays = null;
    }
};
