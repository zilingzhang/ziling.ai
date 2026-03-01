export default {
    name: 'Determining',
    label: 'determining',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Spinning crosshair ring
        var ringGeo = new THREE.TorusGeometry(0.35, 0.008, 8, 48);
        var ringMat = new THREE.MeshBasicMaterial({
            color: 0xff4444, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._crosshairRing = new THREE.Mesh(ringGeo, ringMat);
        this._crosshairRing.position.set(ox, oy + 0.1, 0.02);
        this._crosshairRing.rotation.x = Math.PI * 0.5;
        this._crosshairRing.visible = false;
        scene.add(this._crosshairRing);

        // Inner narrowing ring
        var innerRingGeo = new THREE.TorusGeometry(0.2, 0.006, 8, 48);
        var innerRingMat = new THREE.MeshBasicMaterial({
            color: 0xff6644, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
        this._innerRing.position.set(ox, oy + 0.1, 0.03);
        this._innerRing.rotation.x = Math.PI * 0.5;
        this._innerRing.visible = false;
        scene.add(this._innerRing);

        // Crosshair lines (4 lines forming a +)
        this._crossLines = [];
        var crossDirs = [
            [new THREE.Vector3(-0.4, 0, 0), new THREE.Vector3(-0.05, 0, 0)],
            [new THREE.Vector3(0.05, 0, 0), new THREE.Vector3(0.4, 0, 0)],
            [new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0, -0.05, 0)],
            [new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 0.4, 0)]
        ];
        for (var i = 0; i < 4; i++) {
            var clGeo = new THREE.BufferGeometry().setFromPoints(crossDirs[i]);
            var clMat = new THREE.LineBasicMaterial({
                color: 0xff5544, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var cl = new THREE.Line(clGeo, clMat);
            cl.position.set(ox, oy + 0.1, 0.02);
            cl.visible = false;
            scene.add(cl);
            this._crossLines.push({ line: cl });
        }

        // 10 candidate dots (small spheres) scattered
        this._candidates = [];
        var candGeo = new THREE.SphereGeometry(0.025, 8, 8);
        for (var c = 0; c < 10; c++) {
            var candMat = new THREE.MeshBasicMaterial({
                color: c < 5 ? 0xffaa44 : 0xff6644,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cand = new THREE.Mesh(candGeo, candMat);
            cand.visible = false;
            scene.add(cand);

            var ca = Math.random() * Math.PI * 2;
            var cd = 0.2 + Math.random() * 0.25;
            this._candidates.push({
                mesh: cand,
                x: ox + Math.cos(ca) * cd,
                y: oy + 0.1 + Math.sin(ca) * cd * 0.7,
                eliminated: false,
                eliminateTime: 0.2 + c * 0.07
            });
        }

        // Converging arrow (thin triangle)
        var arrowGeo = new THREE.BufferGeometry();
        var arrowVerts = new Float32Array([
            0, 0.06, 0,
            -0.02, -0.02, 0,
            0.02, -0.02, 0
        ]);
        arrowGeo.setAttribute('position', new THREE.BufferAttribute(arrowVerts, 3));
        var arrowMat = new THREE.MeshBasicMaterial({
            color: 0xff2222, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._arrow = new THREE.Mesh(arrowGeo, arrowMat);
        this._arrow.position.set(ox, oy - 0.2, 0.04);
        this._arrow.visible = false;
        scene.add(this._arrow);

        // Lock-on flash / bulls-eye glow
        var flashGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xff4422, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._flash = new THREE.Mesh(flashGeo, flashMat);
        this._flash.position.set(ox, oy + 0.1, 0);
        this._flash.visible = false;
        scene.add(this._flash);

        // Bulls-eye center dot
        var bullGeo = new THREE.SphereGeometry(0.04, 8, 8);
        var bullMat = new THREE.MeshBasicMaterial({
            color: 0xff0000, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._bullseye = new THREE.Mesh(bullGeo, bullMat);
        this._bullseye.position.set(ox, oy + 0.1, 0.04);
        this._bullseye.visible = false;
        scene.add(this._bullseye);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Crosshair appears, candidates scatter in
            var t = progress / 0.10;
            this._crosshairRing.visible = true;
            this._crosshairRing.material.opacity = t * 0.5;
            this._innerRing.visible = true;
            this._innerRing.material.opacity = t * 0.3;

            for (var ci = 0; ci < 4; ci++) {
                this._crossLines[ci].line.visible = true;
                this._crossLines[ci].line.material.opacity = t * 0.4;
            }

            for (var i = 0; i < 10; i++) {
                if (t > i * 0.08) {
                    this._candidates[i].mesh.visible = true;
                    this._candidates[i].mesh.material.opacity = Math.min(0.7, (t - i * 0.08) * 3);
                    this._candidates[i].mesh.position.set(this._candidates[i].x, this._candidates[i].y, 0.03);
                }
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.50) {
            // Phase 2: Ring spins and narrows, candidates eliminated one by one
            var t2 = (progress - 0.10) / 0.40;
            var shrink = 1 - t2 * 0.6;
            this._crosshairRing.scale.setScalar(shrink);
            this._crosshairRing.material.opacity = 0.5 + Math.sin(time * 4) * 0.1;
            this._crosshairRing.rotation.z += delta * (2 + t2 * 4);

            this._innerRing.scale.setScalar(shrink * 0.8);
            this._innerRing.material.opacity = 0.3 + Math.sin(time * 5) * 0.1;
            this._innerRing.rotation.z -= delta * (3 + t2 * 5);

            for (var cli = 0; cli < 4; cli++) {
                this._crossLines[cli].line.material.opacity = 0.4 + Math.sin(time * 3 + cli) * 0.1;
                this._crossLines[cli].line.scale.setScalar(shrink);
            }

            // Eliminate candidates
            for (var j = 0; j < 10; j++) {
                var cand = this._candidates[j];
                if (t2 > cand.eliminateTime && !cand.eliminated) {
                    cand.eliminated = true;
                }
                if (cand.eliminated) {
                    cand.mesh.material.opacity *= 0.95;
                    cand.mesh.scale.setScalar(Math.max(0, cand.mesh.scale.x - delta * 1.5));
                    if (cand.mesh.material.opacity < 0.02) cand.mesh.visible = false;
                } else {
                    cand.mesh.material.opacity = 0.7 + Math.sin(time * 3 + j) * 0.1;
                    cand.mesh.position.y = cand.y + Math.sin(time * 2 + j) * 0.005;
                }
            }

            model.position.set(ox, oy + Math.sin(time * 2) * 0.003, oz);
        } else if (progress < 0.70) {
            // Phase 3: Arrow converges, final candidate remains
            var t3 = (progress - 0.50) / 0.20;
            this._crosshairRing.scale.setScalar(0.4 - t3 * 0.25);
            this._crosshairRing.rotation.z += delta * 6;
            this._crosshairRing.material.opacity = 0.6;

            this._innerRing.scale.setScalar(0.32 - t3 * 0.2);
            this._innerRing.rotation.z -= delta * 8;
            this._innerRing.material.opacity = 0.4;

            // Arrow appears and moves up
            this._arrow.visible = true;
            this._arrow.material.opacity = t3 * 0.8;
            this._arrow.position.set(ox, oy - 0.2 + t3 * 0.25, 0.04);

            // Remaining candidate pulses
            var lastCand = this._candidates[this._candidates.length - 1];
            if (!lastCand.eliminated) {
                lastCand.mesh.material.opacity = 0.8 + Math.sin(time * 6) * 0.15;
                lastCand.mesh.scale.setScalar(1 + Math.sin(time * 4) * 0.15);
            }

            for (var cli2 = 0; cli2 < 4; cli2++) {
                this._crossLines[cli2].line.scale.setScalar(0.4 - t3 * 0.25);
            }

            model.position.set(ox, oy, oz);
        } else if (progress < 0.82) {
            // Phase 4: Lock-on flash, bulls-eye
            var t4 = (progress - 0.70) / 0.12;

            this._flash.visible = true;
            var flashPulse = t4 < 0.3 ? t4 / 0.3 : (1 - (t4 - 0.3) / 0.7);
            this._flash.material.opacity = flashPulse * 0.5;
            this._flash.scale.setScalar(1 + flashPulse * 2);

            this._bullseye.visible = true;
            this._bullseye.material.opacity = t4 * 0.9;
            this._bullseye.scale.setScalar(0.5 + t4 * 0.5);

            this._crosshairRing.scale.setScalar(0.15);
            this._crosshairRing.material.opacity = 0.7;
            this._innerRing.scale.setScalar(0.12);
            this._innerRing.material.opacity = 0.5;

            this._arrow.material.opacity = 0.8 * (1 - t4);

            for (var cli3 = 0; cli3 < 4; cli3++) {
                this._crossLines[cli3].line.scale.setScalar(0.15);
                this._crossLines[cli3].line.material.opacity = 0.5;
            }

            model.position.set(ox, oy + 0.005, oz);
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.82) / 0.18;
            this._crosshairRing.material.opacity = 0.7 * (1 - t5);
            this._innerRing.material.opacity = 0.5 * (1 - t5);
            this._bullseye.material.opacity = 0.9 * (1 - t5);
            this._flash.material.opacity = 0;
            this._flash.visible = false;
            this._arrow.material.opacity = 0;
            this._arrow.visible = false;

            for (var cli4 = 0; cli4 < 4; cli4++) {
                this._crossLines[cli4].line.material.opacity = 0.5 * (1 - t5);
            }

            model.position.set(ox, oy + 0.005 * (1 - t5), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._crosshairRing) { scene.remove(this._crosshairRing); this._crosshairRing.geometry.dispose(); this._crosshairRing.material.dispose(); }
        if (this._innerRing) { scene.remove(this._innerRing); this._innerRing.geometry.dispose(); this._innerRing.material.dispose(); }
        if (this._crossLines) {
            this._crossLines.forEach(function(c) {
                scene.remove(c.line); c.line.geometry.dispose(); c.line.material.dispose();
            });
        }
        if (this._candidates) {
            this._candidates.forEach(function(c) {
                scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose();
            });
        }
        if (this._arrow) { scene.remove(this._arrow); this._arrow.geometry.dispose(); this._arrow.material.dispose(); }
        if (this._flash) { scene.remove(this._flash); this._flash.geometry.dispose(); this._flash.material.dispose(); }
        if (this._bullseye) { scene.remove(this._bullseye); this._bullseye.geometry.dispose(); this._bullseye.material.dispose(); }
        this._crosshairRing = this._innerRing = this._crossLines = this._candidates = null;
        this._arrow = this._flash = this._bullseye = null;
    }
};
