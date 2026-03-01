export default {
    name: 'Sprouting',
    label: 'sprouting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var baseX = this._origPos.x + 0.5;
        var groundY = this._origPos.y - 0.5;

        // Seed - small brown sphere
        var seedGeo = new THREE.SphereGeometry(0.04, 6, 6);
        var seedMat = new THREE.MeshBasicMaterial({
            color: 0x886633, transparent: true, opacity: 0
        });
        this._seed = new THREE.Mesh(seedGeo, seedMat);
        this._seed.position.set(baseX, this._origPos.y + 0.5, 0);
        scene.add(this._seed);
        this._seedLanded = false;
        this._seedVy = 0;
        this._groundY = groundY;
        this._baseX = baseX;

        // Roots - thin line geometries extending downward
        this._roots = [];
        this._rootGroup = new THREE.Group();
        scene.add(this._rootGroup);
        var rootPaths = [
            [{ x: 0, y: 0 }, { x: -0.08, y: -0.1 }, { x: -0.15, y: -0.25 }, { x: -0.12, y: -0.4 }],
            [{ x: 0, y: 0 }, { x: 0.06, y: -0.12 }, { x: 0.14, y: -0.28 }, { x: 0.18, y: -0.38 }],
            [{ x: 0, y: 0 }, { x: -0.02, y: -0.15 }, { x: -0.08, y: -0.3 }, { x: 0.02, y: -0.42 }],
            [{ x: 0, y: 0 }, { x: 0.1, y: -0.08 }, { x: 0.2, y: -0.2 }, { x: 0.15, y: -0.35 }]
        ];
        for (var r = 0; r < rootPaths.length; r++) {
            var rPath = rootPaths[r];
            var rGeo = new THREE.BufferGeometry();
            var rPositions = new Float32Array(rPath.length * 3);
            for (var rp = 0; rp < rPath.length; rp++) {
                rPositions[rp * 3] = baseX + rPath[rp].x;
                rPositions[rp * 3 + 1] = groundY + rPath[rp].y;
                rPositions[rp * 3 + 2] = 0;
            }
            rGeo.setAttribute('position', new THREE.BufferAttribute(rPositions, 3));
            var rMat = new THREE.LineBasicMaterial({
                color: r % 2 === 0 ? 0x885522 : 0x774411,
                transparent: true, opacity: 0
            });
            var rootLine = new THREE.Line(rGeo, rMat);
            rootLine.visible = false;
            this._rootGroup.add(rootLine);
            this._roots.push({
                line: rootLine,
                points: rPath,
                growProgress: 0
            });
        }

        // Stem - cylinder that grows upward
        var stemGeo = new THREE.CylinderGeometry(0.015, 0.02, 1, 6);
        var stemMat = new THREE.MeshBasicMaterial({
            color: 0x44aa33, transparent: true, opacity: 0
        });
        this._stem = new THREE.Mesh(stemGeo, stemMat);
        this._stem.position.set(baseX, groundY, 0);
        this._stem.scale.set(1, 0.01, 1);
        scene.add(this._stem);

        // Leaves - flat disc circles, green
        this._leaves = [];
        var leafData = [
            { height: 0.25, angle: -0.5, size: 0.06 },
            { height: 0.25, angle: 0.5, size: 0.06 },
            { height: 0.45, angle: -0.6, size: 0.07 },
            { height: 0.45, angle: 0.6, size: 0.07 },
            { height: 0.65, angle: -0.4, size: 0.055 },
            { height: 0.65, angle: 0.4, size: 0.055 }
        ];
        for (var l = 0; l < leafData.length; l++) {
            var ld = leafData[l];
            var lGeo = new THREE.CircleGeometry(ld.size, 8);
            var lMat = new THREE.MeshBasicMaterial({
                color: l % 3 === 0 ? 0x33bb22 : (l % 3 === 1 ? 0x44cc33 : 0x55dd44),
                transparent: true, opacity: 0,
                side: THREE.DoubleSide
            });
            var leaf = new THREE.Mesh(lGeo, lMat);
            leaf.visible = false;
            leaf.position.set(baseX, groundY + ld.height, 0.01);
            leaf.rotation.z = ld.angle > 0 ? -Math.PI / 4 : Math.PI / 4;
            leaf.scale.setScalar(0.01);
            scene.add(leaf);
            this._leaves.push({
                mesh: leaf, data: ld,
                unfurled: false, unfurlProgress: 0
            });
        }

        // Flower bud - 3 layered discs at top
        this._petals = [];
        var petalColors = [0xff6688, 0xff88aa, 0xffaacc];
        for (var f = 0; f < 3; f++) {
            var fGeo = new THREE.CircleGeometry(0.05 + f * 0.015, 10);
            var fMat = new THREE.MeshBasicMaterial({
                color: petalColors[f], transparent: true, opacity: 0,
                side: THREE.DoubleSide
            });
            var petal = new THREE.Mesh(fGeo, fMat);
            petal.visible = false;
            petal.position.set(baseX, groundY + 0.85, 0.02 + f * 0.01);
            petal.scale.setScalar(0.01);
            scene.add(petal);
            this._petals.push({ mesh: petal, layer: f, openProgress: 0 });
        }

        // Flower center
        var centerGeo = new THREE.SphereGeometry(0.025, 6, 6);
        var centerMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0
        });
        this._flowerCenter = new THREE.Mesh(centerGeo, centerMat);
        this._flowerCenter.visible = false;
        this._flowerCenter.position.set(baseX, groundY + 0.85, 0.05);
        scene.add(this._flowerCenter);

        // Green sparkle particles
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var s = 0; s < 15; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 2 === 0 ? 0x88ff66 : 0xaaff88,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sparkle = new THREE.Mesh(spkGeo, sMat);
            sparkle.visible = false;
            scene.add(sparkle);
            this._sparkles.push({
                mesh: sparkle, life: 0, maxLife: 0,
                vx: 0, vy: 0, active: false
            });
        }
        this._spkIdx = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;

        // Phase: Seed drops and lands (0-10%)
        if (progress < 0.10) {
            var seedProg = progress / 0.10;
            this._seed.material.opacity = Math.min(seedProg * 2, 1.0);
            if (!this._seedLanded) {
                var targetY = this._groundY + 0.04;
                var currentY = orig.y + 0.5 - (orig.y + 0.5 - targetY) * seedProg * seedProg;
                this._seed.position.y = currentY;
                if (seedProg > 0.95) {
                    this._seedLanded = true;
                    this._seed.position.y = targetY;
                }
            }
        }
        // Phase: Roots extend (10-20%)
        else if (progress < 0.20) {
            var rootProg = (progress - 0.10) / 0.10;
            this._seed.material.opacity = 1.0 - rootProg * 0.5;
            for (var r = 0; r < this._roots.length; r++) {
                var root = this._roots[r];
                root.line.visible = true;
                root.line.material.opacity = rootProg * 0.7;
                // Animate root growth by updating positions
                var pts = root.points;
                var posArr = root.line.geometry.attributes.position.array;
                var segVisible = Math.floor(rootProg * pts.length);
                for (var rp = 0; rp < pts.length; rp++) {
                    var segProg = Math.min(Math.max((rootProg * pts.length - rp), 0), 1);
                    posArr[rp * 3] = this._baseX + pts[0].x + (pts[rp].x - pts[0].x) * segProg;
                    posArr[rp * 3 + 1] = this._groundY + pts[0].y + (pts[rp].y - pts[0].y) * segProg;
                }
                root.line.geometry.attributes.position.needsUpdate = true;
            }
        }
        // Phase: Stem grows upward (20-45%)
        else if (progress < 0.45) {
            var stemProg = (progress - 0.20) / 0.25;
            // Keep roots visible
            for (var r2 = 0; r2 < this._roots.length; r2++) {
                this._roots[r2].line.material.opacity = 0.7;
            }
            // Seed fades into stem
            this._seed.material.opacity = Math.max(0, 0.5 - stemProg);
            // Stem grows
            this._stem.material.opacity = stemProg;
            var stemHeight = stemProg * 0.85;
            this._stem.scale.set(1, stemHeight, 1);
            this._stem.position.y = this._groundY + stemHeight * 0.5;
        }
        // Phase: Leaves unfurl (45-65%)
        else if (progress < 0.65) {
            var leafProg = (progress - 0.45) / 0.20;
            this._stem.material.opacity = 1.0;
            this._stem.scale.set(1, 0.85, 1);
            this._stem.position.y = this._groundY + 0.85 * 0.5;
            for (var li = 0; li < this._leaves.length; li++) {
                var leaf = this._leaves[li];
                var leafStart = li / this._leaves.length;
                var leafLocal = Math.max(0, Math.min((leafProg - leafStart * 0.5) / 0.5, 1));
                leaf.mesh.visible = leafLocal > 0;
                leaf.mesh.material.opacity = leafLocal * 0.8;
                // Unfurl: rotate from flat to angled
                var unfurl = 1 - Math.pow(1 - leafLocal, 2);
                var targetAngle = leaf.data.angle > 0 ? -Math.PI / 4 : Math.PI / 4;
                leaf.mesh.rotation.z = targetAngle * unfurl;
                leaf.mesh.scale.setScalar(unfurl);
                // Sway
                leaf.mesh.rotation.z += Math.sin(time * 2 + li) * 0.05 * unfurl;
                leaf.mesh.position.y = this._groundY + leaf.data.height;
                leaf.mesh.position.x = this._baseX + (leaf.data.angle > 0 ? 1 : -1) * 0.04 * unfurl;
            }
        }
        // Phase: Flower opens (65-80%)
        else if (progress < 0.80) {
            var flowerProg = (progress - 0.65) / 0.15;
            // Keep leaves swaying
            for (var li2 = 0; li2 < this._leaves.length; li2++) {
                var lf = this._leaves[li2];
                lf.mesh.rotation.z += Math.sin(time * 2 + li2) * 0.05;
            }
            // Petals open
            for (var fi = 0; fi < this._petals.length; fi++) {
                var petal = this._petals[fi];
                var petalStart = fi * 0.2;
                var petalLocal = Math.max(0, Math.min((flowerProg - petalStart) / 0.5, 1));
                petal.mesh.visible = petalLocal > 0;
                petal.mesh.material.opacity = petalLocal * 0.8;
                var openScale = petalLocal * (1 + fi * 0.15);
                petal.mesh.scale.setScalar(openScale);
                // Slight rotation spread
                petal.mesh.rotation.z = fi * 0.4 * petalLocal + Math.sin(time * 1.5) * 0.05;
            }
            // Flower center
            if (flowerProg > 0.5) {
                this._flowerCenter.visible = true;
                this._flowerCenter.material.opacity = (flowerProg - 0.5) * 2;
            }
        }
        // Phase: Full bloom, sparkles (80-92%)
        else if (progress < 0.92) {
            // Everything in full display
            for (var li3 = 0; li3 < this._leaves.length; li3++) {
                this._leaves[li3].mesh.rotation.z += Math.sin(time * 2 + li3) * 0.05;
            }
            for (var fi2 = 0; fi2 < this._petals.length; fi2++) {
                var pt = this._petals[fi2];
                pt.mesh.material.opacity = 0.8;
                pt.mesh.rotation.z = fi2 * 0.4 + Math.sin(time * 1.5 + fi2) * 0.08;
                pt.mesh.scale.setScalar(1 + fi2 * 0.15 + Math.sin(time * 2) * 0.05);
            }
            this._flowerCenter.material.opacity = 1.0;
            this._flowerCenter.scale.setScalar(1 + Math.sin(time * 3) * 0.1);

            // Spawn sparkles
            if (Math.random() < 0.3) {
                var spk = this._sparkles[this._spkIdx % this._sparkles.length];
                this._spkIdx++;
                spk.active = true;
                spk.mesh.visible = true;
                spk.mesh.position.set(
                    this._baseX + (Math.random() - 0.5) * 0.4,
                    this._groundY + 0.5 + Math.random() * 0.5,
                    (Math.random() - 0.5) * 0.2
                );
                spk.vx = (Math.random() - 0.5) * 0.3;
                spk.vy = 0.2 + Math.random() * 0.3;
                spk.life = 0.5 + Math.random() * 0.5;
                spk.maxLife = spk.life;
            }
        }
        // Phase: Fade (92-100%)
        else {
            var fadeProg = (progress - 0.92) / 0.08;
            var fadeOp = 1 - fadeProg;
            this._stem.material.opacity = fadeOp;
            for (var ri = 0; ri < this._roots.length; ri++) {
                this._roots[ri].line.material.opacity = 0.7 * fadeOp;
            }
            for (var li4 = 0; li4 < this._leaves.length; li4++) {
                this._leaves[li4].mesh.material.opacity = 0.8 * fadeOp;
            }
            for (var fi3 = 0; fi3 < this._petals.length; fi3++) {
                this._petals[fi3].mesh.material.opacity = 0.8 * fadeOp;
            }
            this._flowerCenter.material.opacity = fadeOp;
        }

        // Update sparkles
        for (var si = 0; si < this._sparkles.length; si++) {
            var s = this._sparkles[si];
            if (!s.active) continue;
            s.life -= delta;
            if (s.life <= 0) { s.active = false; s.mesh.visible = false; continue; }
            s.mesh.position.x += s.vx * delta;
            s.mesh.position.y += s.vy * delta;
            s.mesh.material.opacity = 0.6 * (s.life / s.maxLife);
            s.mesh.scale.setScalar(0.5 + (1 - s.life / s.maxLife) * 0.5);
        }

        // Model stays near base, gentle pulse
        model.position.set(orig.x, orig.y, orig.z);
        model.scale.setScalar(this._origScale.x * (1 + Math.sin(time * 1.5) * 0.02));

        if (progress >= 0.92) {
            model.scale.copy(this._origScale);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._seed) { scene.remove(this._seed); this._seed.geometry.dispose(); this._seed.material.dispose(); }
        if (this._rootGroup) {
            this._rootGroup.traverse(function(child) {
                if (child.isLine) { child.geometry.dispose(); child.material.dispose(); }
            });
            scene.remove(this._rootGroup);
        }
        if (this._stem) { scene.remove(this._stem); this._stem.geometry.dispose(); this._stem.material.dispose(); }
        if (this._leaves) { this._leaves.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        if (this._petals) { this._petals.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._flowerCenter) { scene.remove(this._flowerCenter); this._flowerCenter.geometry.dispose(); this._flowerCenter.material.dispose(); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._seed = this._rootGroup = this._roots = this._stem = this._leaves = this._petals = this._flowerCenter = this._sparkles = null;
    }
};
