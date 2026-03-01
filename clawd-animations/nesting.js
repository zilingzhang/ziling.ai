export default {
    name: 'Nesting',
    label: 'nesting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Twig particles scattered around (thin cylinders)
        this._twigs = [];
        var twigGeo = new THREE.BoxGeometry(0.06, 0.008, 0.005);
        var twigColors = [0x886644, 0x775533, 0x997755, 0x664422, 0x887755];
        for (var t = 0; t < 14; t++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: twigColors[t % twigColors.length],
                transparent: true, opacity: 0
            });
            var twig = new THREE.Mesh(twigGeo, tMat);
            // Scatter around the scene
            var angle = Math.random() * Math.PI * 2;
            var dist = 0.4 + Math.random() * 0.5;
            twig.position.set(
                ox + Math.cos(angle) * dist,
                oy + Math.sin(angle) * dist * 0.5 - 0.1,
                0
            );
            twig.rotation.z = Math.random() * Math.PI;
            twig.visible = false;
            scene.add(twig);
            this._twigs.push({
                mesh: twig,
                origX: twig.position.x,
                origY: twig.position.y,
                origRot: twig.rotation.z,
                gathered: false,
                nestAngle: (t / 14) * Math.PI * 2,
                nestRadius: 0.12 + (t % 3) * 0.03
            });
        }

        // Growing nest ring (built from placed twigs)
        this._nestRing = [];
        var ringGeo = new THREE.BoxGeometry(0.05, 0.008, 0.005);
        for (var nr = 0; nr < 20; nr++) {
            var nrMat = new THREE.MeshBasicMaterial({
                color: nr % 2 === 0 ? 0x886644 : 0x775533,
                transparent: true, opacity: 0
            });
            var nrMesh = new THREE.Mesh(ringGeo, nrMat);
            var nrAngle = (nr / 20) * Math.PI * 2;
            nrMesh.position.set(
                ox + Math.cos(nrAngle) * 0.15,
                oy - 0.3 + Math.sin(nrAngle) * 0.05,
                0
            );
            nrMesh.rotation.z = nrAngle + Math.PI / 2;
            nrMesh.visible = false;
            scene.add(nrMesh);
            this._nestRing.push({ mesh: nrMesh, placed: false });
        }

        // Soft lining particles (cotton-white spheres)
        this._lining = [];
        var linGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var l = 0; l < 10; l++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: 0xeeeedd, transparent: true, opacity: 0,
                depthWrite: false
            });
            var lin = new THREE.Mesh(linGeo, lMat);
            lin.visible = false;
            var lAngle = (l / 10) * Math.PI * 2;
            lin.position.set(
                ox + Math.cos(lAngle) * 0.08,
                oy - 0.3 + Math.sin(lAngle) * 0.03,
                0.01
            );
            scene.add(lin);
            this._lining.push({ mesh: lin });
        }

        // Cozy completion glow
        var glowGeo = new THREE.SphereGeometry(0.25, 10, 10);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xddcc88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._cozyGlow = new THREE.Mesh(glowGeo, glowMat);
        this._cozyGlow.position.set(ox, oy - 0.25, 0);
        scene.add(this._cozyGlow);

        this._gatherIdx = 0;
        this._lastGather = 0;
        this._ringPlaced = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var nestCenter = { x: ox, y: oy - 0.3 };

        // Phase 1: Twigs appear scattered (0-8%)
        if (progress < 0.08) {
            var t = progress / 0.08;
            for (var i = 0; i < this._twigs.length; i++) {
                this._twigs[i].mesh.visible = true;
                this._twigs[i].mesh.material.opacity = t * 0.6;
            }
            model.position.set(ox, oy, oz);
        }
        // Phase 2: Model gathers twigs (8-45%)
        else if (progress < 0.45) {
            var t2 = (progress - 0.08) / 0.37;
            var gatherCount = Math.floor(t2 * this._twigs.length);

            for (var g = 0; g < this._twigs.length; g++) {
                var tw = this._twigs[g];
                if (g < gatherCount && !tw.gathered) {
                    tw.gathered = true;
                }

                if (tw.gathered) {
                    // Move twig toward nest center
                    var gatherT = Math.min((t2 * this._twigs.length - g) / 2, 1);
                    gatherT = Math.max(gatherT, 0);
                    tw.mesh.position.set(
                        tw.origX + (nestCenter.x + Math.cos(tw.nestAngle) * tw.nestRadius - tw.origX) * gatherT,
                        tw.origY + (nestCenter.y + Math.sin(tw.nestAngle) * 0.04 - tw.origY) * gatherT,
                        0
                    );
                    tw.mesh.rotation.z = tw.origRot + (tw.nestAngle + Math.PI / 2 - tw.origRot) * gatherT;
                    tw.mesh.material.opacity = 0.6;
                } else {
                    tw.mesh.material.opacity = 0.6;
                }
            }

            // Model moves to gather (goes toward next ungathered twig)
            var targetTwigIdx = Math.min(gatherCount, this._twigs.length - 1);
            var targetTwig = this._twigs[targetTwigIdx];
            if (!targetTwig.gathered) {
                model.position.set(
                    targetTwig.origX * 0.5 + ox * 0.5,
                    targetTwig.origY * 0.5 + oy * 0.5,
                    oz
                );
            } else {
                model.position.set(ox, oy - 0.1, oz);
            }

            // Nest ring builds as twigs arrive
            var ringProgress = Math.floor(gatherCount * (this._nestRing.length / this._twigs.length));
            for (var nr = 0; nr < this._nestRing.length; nr++) {
                if (nr < ringProgress) {
                    this._nestRing[nr].mesh.visible = true;
                    this._nestRing[nr].mesh.material.opacity = 0.7;
                }
            }
        }
        // Phase 3: Weaving circular structure (45-62%)
        else if (progress < 0.62) {
            var t3 = (progress - 0.45) / 0.17;

            // All twigs now part of nest, hide individual ones
            for (var h = 0; h < this._twigs.length; h++) {
                this._twigs[h].mesh.material.opacity = 0.6 * (1 - t3);
            }

            // Full nest ring visible
            for (var nr2 = 0; nr2 < this._nestRing.length; nr2++) {
                this._nestRing[nr2].mesh.visible = true;
                this._nestRing[nr2].mesh.material.opacity = 0.7;
            }

            // Model weaves (small circular motion)
            var weaveAngle = time * 3;
            model.position.set(
                ox + Math.cos(weaveAngle) * 0.05,
                oy - 0.1 + Math.sin(weaveAngle) * 0.03,
                oz
            );
            model.rotation.z = Math.sin(weaveAngle) * 0.04;
        }
        // Phase 4: Lining with soft particles (62-78%)
        else if (progress < 0.78) {
            var t4 = (progress - 0.62) / 0.16;

            // Hide gathering twigs
            for (var h2 = 0; h2 < this._twigs.length; h2++) {
                this._twigs[h2].mesh.visible = false;
            }

            // Lining appears
            var numLining = Math.floor(t4 * this._lining.length);
            for (var li = 0; li < this._lining.length; li++) {
                if (li < numLining) {
                    this._lining[li].mesh.visible = true;
                    this._lining[li].mesh.material.opacity = Math.min((t4 * this._lining.length - li) * 2, 0.6);
                }
            }

            model.position.set(ox, oy - 0.1, oz);
            model.rotation.z = 0;
        }
        // Phase 5: Cozy completion glow (78-90%)
        else if (progress < 0.90) {
            var t5 = (progress - 0.78) / 0.12;

            // Cozy glow
            this._cozyGlow.material.opacity = t5 * 0.15 * (1 + Math.sin(time * 2) * 0.3);
            this._cozyGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.08);

            model.position.set(ox, oy - 0.1, oz);

            // All lining visible
            for (var li2 = 0; li2 < this._lining.length; li2++) {
                this._lining[li2].mesh.visible = true;
                this._lining[li2].mesh.material.opacity = 0.6;
            }
        }
        // Phase 6: Fade out (90-100%)
        else {
            var t6 = (progress - 0.90) / 0.10;

            for (var nr3 = 0; nr3 < this._nestRing.length; nr3++) {
                this._nestRing[nr3].mesh.material.opacity = 0.7 * (1 - t6);
            }
            for (var li3 = 0; li3 < this._lining.length; li3++) {
                this._lining[li3].mesh.material.opacity = 0.6 * (1 - t6);
            }
            this._cozyGlow.material.opacity = 0.15 * (1 - t6);

            model.position.set(
                ox,
                oy - 0.1 * (1 - t6),
                oz
            );
            model.rotation.z = 0;
            if (t6 > 0.8) {
                model.position.copy(this._origPos);
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._twigs) { this._twigs.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        if (this._nestRing) { this._nestRing.forEach(function(n) { scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose(); }); }
        if (this._lining) { this._lining.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        if (this._cozyGlow) { scene.remove(this._cozyGlow); this._cozyGlow.geometry.dispose(); this._cozyGlow.material.dispose(); }
        this._twigs = this._nestRing = this._lining = this._cozyGlow = null;
    }
};