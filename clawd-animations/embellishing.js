export default {
    name: 'Embellishing',
    label: 'embellishing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Plain object (simple box that gets decorated)
        var objGeo = new THREE.BoxGeometry(0.15, 0.2, 0.08);
        var objMat = new THREE.MeshBasicMaterial({
            color: 0x886644, transparent: true, opacity: 0
        });
        this._plainObj = new THREE.Mesh(objGeo, objMat);
        this._plainObj.position.set(ox - 0.2, oy - 0.05, 0);
        scene.add(this._plainObj);

        // Scroll patterns (small tori as decorative elements)
        this._scrolls = [];
        var scrollPositions = [
            { x: -0.07, y: 0.08 }, { x: -0.07, y: -0.08 },
            { x: -0.33, y: 0.08 }, { x: -0.33, y: -0.08 },
            { x: -0.2, y: 0.12 }, { x: -0.2, y: -0.14 }
        ];
        for (var si = 0; si < scrollPositions.length; si++) {
            var scGeo = new THREE.TorusGeometry(0.018, 0.004, 6, 12);
            var scMat = new THREE.MeshBasicMaterial({
                color: 0xddaa44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var scroll = new THREE.Mesh(scGeo, scMat);
            scroll.position.set(ox + scrollPositions[si].x, oy + scrollPositions[si].y, 0.05);
            scroll.visible = false;
            scene.add(scroll);
            this._scrolls.push({
                mesh: scroll,
                appearStart: 0.15 + si * 0.04,
                rotSpeed: (Math.random() - 0.5) * 2
            });
        }

        // Gems (colored spheres)
        this._gems = [];
        var gemColors = [0xff2244, 0x2244ff, 0x22ff44, 0xff44aa, 0xffcc00,
                         0x44ffff, 0xaa22ff, 0xff8800];
        var gemPositions = [
            { x: -0.2, y: 0.03 }, { x: -0.15, y: -0.02 },
            { x: -0.25, y: -0.02 }, { x: -0.2, y: -0.07 },
            { x: -0.12, y: 0.06 }, { x: -0.28, y: 0.06 },
            { x: -0.17, y: 0.10 }, { x: -0.23, y: 0.10 }
        ];
        for (var gi = 0; gi < gemPositions.length; gi++) {
            var gGeo = new THREE.SphereGeometry(0.012, 8, 8);
            var gMat = new THREE.MeshBasicMaterial({
                color: gemColors[gi], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var gem = new THREE.Mesh(gGeo, gMat);
            gem.position.set(ox + gemPositions[gi].x, oy + gemPositions[gi].y, 0.06);
            gem.visible = false;
            scene.add(gem);
            this._gems.push({
                mesh: gem,
                appearStart: 0.32 + gi * 0.03,
                shimmerPhase: Math.random() * Math.PI * 2
            });
        }

        // Filigree lines (thin line geometries as decorative strands)
        this._filigree = [];
        var filDefs = [
            [ox - 0.28, oy + 0.1, ox - 0.12, oy + 0.1],
            [ox - 0.28, oy - 0.12, ox - 0.12, oy - 0.12],
            [ox - 0.08, oy + 0.05, ox - 0.08, oy - 0.05],
            [ox - 0.32, oy + 0.05, ox - 0.32, oy - 0.05],
            [ox - 0.27, oy + 0.04, ox - 0.13, oy - 0.04],
            [ox - 0.13, oy + 0.04, ox - 0.27, oy - 0.04]
        ];
        for (var fi = 0; fi < filDefs.length; fi++) {
            var fPts = [];
            fPts.push(new THREE.Vector3(filDefs[fi][0], filDefs[fi][1], 0.04));
            fPts.push(new THREE.Vector3(filDefs[fi][2], filDefs[fi][3], 0.04));
            var fGeo = new THREE.BufferGeometry().setFromPoints(fPts);
            var fMat = new THREE.LineBasicMaterial({
                color: 0xccaa33, transparent: true, opacity: 0
            });
            var fil = new THREE.Line(fGeo, fMat);
            fil.visible = false;
            scene.add(fil);
            this._filigree.push({
                line: fil,
                appearStart: 0.50 + fi * 0.03
            });
        }

        // Gold leaf particles
        this._goldLeaf = [];
        var leafGeo = new THREE.BoxGeometry(0.01, 0.01, 0.002);
        for (var li = 0; li < 25; li++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: li % 3 === 0 ? 0xffdd44 : (li % 3 === 1 ? 0xffcc22 : 0xeeaa11),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var leaf = new THREE.Mesh(leafGeo, lMat);
            leaf.visible = false;
            scene.add(leaf);
            this._goldLeaf.push({
                mesh: leaf, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0,
                rotSpeed: 0
            });
        }
        this._leafIdx = 0;

        // Baroque glow
        var glowGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.2, oy - 0.05, -0.05);
        scene.add(this._glow);
    },
    _emitLeaf(x, y) {
        var l = this._goldLeaf[this._leafIdx % this._goldLeaf.length];
        this._leafIdx++;
        l.mesh.visible = true;
        l.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y + 0.1, 0.05);
        l.vx = (Math.random() - 0.5) * 0.3;
        l.vy = -0.2 - Math.random() * 0.3;
        l.vz = (Math.random() - 0.5) * 0.1;
        l.life = 0.5 + Math.random() * 0.5;
        l.maxLife = l.life;
        l.rotSpeed = (Math.random() - 0.5) * 10;
        l.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Plain object appears
            var t = progress / 0.10;
            this._plainObj.material.opacity = t * 0.6;
            this._plainObj.scale.setScalar(0.5 + t * 0.5);
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Scroll patterns added
            var t2 = (progress - 0.10) / 0.20;
            this._plainObj.material.opacity = 0.6;

            for (var si = 0; si < this._scrolls.length; si++) {
                var sc = this._scrolls[si];
                var scT = Math.max(0, Math.min(1, (progress - sc.appearStart) / 0.06));
                sc.mesh.visible = scT > 0;
                sc.mesh.material.opacity = scT * 0.6;
                sc.mesh.scale.setScalar(scT);
                sc.mesh.rotation.z += delta * sc.rotSpeed;
                if (scT > 0.2 && scT < 0.5 && Math.random() < 0.1) {
                    this._emitLeaf(sc.mesh.position.x, sc.mesh.position.y);
                }
            }

            model.position.set(ox + 0.15, oy + Math.sin(time * 1.5) * 0.005, oz);
        } else if (progress < 0.52) {
            // Phase 3: Gems placed
            var t3 = (progress - 0.30) / 0.22;
            for (var si2 = 0; si2 < this._scrolls.length; si2++) {
                this._scrolls[si2].mesh.material.opacity = 0.6;
                this._scrolls[si2].mesh.rotation.z += delta * this._scrolls[si2].rotSpeed * 0.3;
            }

            for (var gi = 0; gi < this._gems.length; gi++) {
                var gem = this._gems[gi];
                var gT = Math.max(0, Math.min(1, (progress - gem.appearStart) / 0.05));
                gem.mesh.visible = gT > 0;
                gem.mesh.material.opacity = gT * 0.7;
                gem.mesh.scale.setScalar(gT * 1.2);
                // Flash when appearing
                if (gT > 0.3 && gT < 0.6) {
                    gem.mesh.material.opacity = 0.7 + Math.sin(time * 10) * 0.3;
                    this._emitLeaf(gem.mesh.position.x, gem.mesh.position.y);
                }
            }

            // Object starts looking richer
            this._plainObj.material.color.setRGB(
                0.55 + t3 * 0.2,
                0.4 + t3 * 0.15,
                0.25 + t3 * 0.1
            );

            model.position.set(ox + 0.15, oy + Math.sin(time * 1.5) * 0.005, oz);
            model.rotation.z = Math.sin(time * 1) * 0.015;
        } else if (progress < 0.70) {
            // Phase 4: Filigree lines appear
            var t4 = (progress - 0.52) / 0.18;
            for (var fli = 0; fli < this._filigree.length; fli++) {
                var fl = this._filigree[fli];
                var flT = Math.max(0, Math.min(1, (progress - fl.appearStart) / 0.06));
                fl.line.visible = flT > 0;
                fl.line.material.opacity = flT * 0.5;
            }

            // Gems shimmer
            for (var gi2 = 0; gi2 < this._gems.length; gi2++) {
                this._gems[gi2].mesh.material.opacity = 0.6 + Math.sin(time * 3 + this._gems[gi2].shimmerPhase) * 0.2;
            }

            // Gold leaf particles fall
            if (Math.random() < 0.06) {
                this._emitLeaf(ox - 0.2, oy + 0.05);
            }

            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.88) {
            // Phase 5: Excessive ornamentation - everything shimmers, more gold leaf
            var t5 = (progress - 0.70) / 0.18;
            var pulse = Math.sin(t5 * Math.PI * 3);

            // Object becomes golden
            this._plainObj.material.color.setRGB(0.8 + pulse * 0.1, 0.65 + pulse * 0.1, 0.35);

            // All decorations pulse
            for (var si3 = 0; si3 < this._scrolls.length; si3++) {
                this._scrolls[si3].mesh.material.opacity = 0.6 + pulse * 0.2;
            }
            for (var gi3 = 0; gi3 < this._gems.length; gi3++) {
                this._gems[gi3].mesh.material.opacity = 0.7 + Math.sin(time * 4 + gi3) * 0.25;
                // Color shifts
                var hue = (Math.sin(time * 2 + gi3 * 0.8) * 0.5 + 0.5);
                this._gems[gi3].mesh.material.color.setRGB(0.8 + hue * 0.2, 0.3 + hue * 0.4, 0.2 + (1 - hue) * 0.6);
            }

            // Heavy gold leaf
            if (Math.random() < 0.12) {
                this._emitLeaf(ox - 0.2 + (Math.random() - 0.5) * 0.2, oy);
            }

            this._glow.material.opacity = t5 * 0.15 + pulse * 0.05;
            this._glow.scale.setScalar(1 + t5 * 0.4);

            model.position.set(ox + 0.15, oy, oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;
            var fadeOut = 1 - t6;
            this._plainObj.material.opacity = 0.6 * fadeOut;
            for (var si4 = 0; si4 < this._scrolls.length; si4++) {
                this._scrolls[si4].mesh.material.opacity *= fadeOut;
            }
            for (var gi4 = 0; gi4 < this._gems.length; gi4++) {
                this._gems[gi4].mesh.material.opacity *= fadeOut;
            }
            for (var fli2 = 0; fli2 < this._filigree.length; fli2++) {
                this._filigree[fli2].line.material.opacity *= fadeOut;
            }
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox + 0.15 * fadeOut, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update gold leaf particles
        for (var li = 0; li < this._goldLeaf.length; li++) {
            var lf = this._goldLeaf[li];
            if (lf.life <= 0) continue;
            lf.life -= delta;
            if (lf.life <= 0) { lf.mesh.visible = false; continue; }
            lf.mesh.position.x += lf.vx * delta;
            lf.mesh.position.y += lf.vy * delta;
            lf.mesh.position.z += lf.vz * delta;
            lf.vx += Math.sin(time * 3 + li) * 0.1 * delta;
            lf.mesh.rotation.z += lf.rotSpeed * delta;
            var lr = lf.life / lf.maxLife;
            lf.mesh.material.opacity = lr * 0.7;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._plainObj) { scene.remove(this._plainObj); this._plainObj.geometry.dispose(); this._plainObj.material.dispose(); }
        if (this._scrolls) {
            this._scrolls.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._gems) {
            this._gems.forEach(function(g) { scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); });
        }
        if (this._filigree) {
            this._filigree.forEach(function(f) { scene.remove(f.line); f.line.geometry.dispose(); f.line.material.dispose(); });
        }
        if (this._goldLeaf) {
            this._goldLeaf.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._plainObj = this._scrolls = this._gems = this._filigree = this._goldLeaf = this._glow = null;
    }
};
