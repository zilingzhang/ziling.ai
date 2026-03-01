export default {
    name: 'Manifesting',
    label: 'manifesting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x, oy = this._origPos.y;

        // 30 thought particles (spiral outward then cluster into shape)
        this._particles = [];
        var pGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var i = 0; i < 30; i++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x88ccff : (i % 3 === 1 ? 0xaa88ff : 0xffaa88),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var p = new THREE.Mesh(pGeo, pMat);
            p.visible = false;
            scene.add(p);

            // Each particle has a target position on the wireframe cube
            var cubeSize = 0.3;
            var targetX, targetY, targetZ;
            // Distribute particles along cube edges
            var edge = i % 12;
            var edgeT = (i / 30);
            if (edge < 3) {
                targetX = -cubeSize + edgeT * cubeSize * 2;
                targetY = cubeSize;
                targetZ = edge === 0 ? cubeSize : (edge === 1 ? -cubeSize : 0);
            } else if (edge < 6) {
                targetX = cubeSize;
                targetY = -cubeSize + edgeT * cubeSize * 2;
                targetZ = edge === 3 ? cubeSize : (edge === 4 ? -cubeSize : 0);
            } else if (edge < 9) {
                targetX = -cubeSize + edgeT * cubeSize * 2;
                targetY = -cubeSize;
                targetZ = edge === 6 ? cubeSize : (edge === 7 ? -cubeSize : 0);
            } else {
                targetX = -cubeSize;
                targetY = -cubeSize + edgeT * cubeSize * 2;
                targetZ = edge === 9 ? cubeSize : (edge === 10 ? -cubeSize : 0);
            }

            this._particles.push({
                mesh: p,
                startAngle: (i / 30) * Math.PI * 2,
                spiralSpeed: 1.5 + (i % 5) * 0.3,
                targetX: ox + 0.6 + targetX,
                targetY: oy + 0.1 + targetY,
                targetZ: targetZ * 0.3,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Target shape: wireframe box using EdgesGeometry
        var boxGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        var edgesGeo = new THREE.EdgesGeometry(boxGeo);
        var edgesMat = new THREE.LineBasicMaterial({
            color: 0xaaddff, transparent: true, opacity: 0,
            linewidth: 2
        });
        this._wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
        this._wireframe.position.set(ox + 0.6, oy + 0.1, 0);
        this._wireframe.scale.set(0, 0, 0);
        scene.add(this._wireframe);
        this._boxGeoRef = boxGeo; // keep ref for cleanup

        // Solidification sphere glow
        var solidGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var solidMat = new THREE.MeshBasicMaterial({
            color: 0xaaddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._solidGlow = new THREE.Mesh(solidGeo, solidMat);
        this._solidGlow.position.set(ox + 0.6, oy + 0.1, 0);
        this._solidGlow.scale.set(0, 0, 0);
        scene.add(this._solidGlow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x, oy = this._origPos.y;

        if (progress < 0.12) {
            // Phase 1: Particles emerge from model
            var t = progress / 0.12;
            var numActive = Math.floor(t * 30);

            for (var i = 0; i < this._particles.length; i++) {
                var p = this._particles[i];
                if (i < numActive) {
                    p.mesh.visible = true;
                    var pT = Math.max(0, (t - i / 30) * (30 / numActive));
                    pT = Math.min(pT, 1);
                    p.mesh.material.opacity = pT * 0.8;
                    // Emerge from model position
                    var emergeDist = pT * 0.15;
                    var a = p.startAngle;
                    p.mesh.position.set(
                        ox + Math.cos(a) * emergeDist,
                        oy + Math.sin(a) * emergeDist,
                        0
                    );
                    p.mesh.scale.setScalar(0.3 + pT * 0.7);
                }
            }

            model.scale.setScalar(this._origScale.x * (1 + Math.sin(time * 4) * 0.03 * t));
        } else if (progress < 0.30) {
            // Phase 2: Spiral outward
            var t2 = (progress - 0.12) / 0.18;

            for (var i2 = 0; i2 < this._particles.length; i2++) {
                var p2 = this._particles[i2];
                p2.mesh.visible = true;
                p2.mesh.material.opacity = 0.8;
                var a2 = p2.startAngle + time * p2.spiralSpeed;
                var radius = 0.15 + t2 * 0.6;
                // Spiral outward from model toward right side
                var spiralX = ox + Math.cos(a2) * radius + t2 * 0.3;
                var spiralY = oy + Math.sin(a2) * radius * 0.6;
                p2.mesh.position.set(spiralX, spiralY, Math.sin(a2) * radius * 0.2);
                p2.mesh.scale.setScalar(0.7 + Math.sin(time * 3 + i2) * 0.2);
            }

            model.scale.setScalar(this._origScale.x * (1 + Math.sin(time * 3) * 0.04));
        } else if (progress < 0.55) {
            // Phase 3: Particles begin clustering into shape
            var t3 = (progress - 0.30) / 0.25;
            var clusterStrength = t3 * t3; // ease in

            for (var i3 = 0; i3 < this._particles.length; i3++) {
                var p3 = this._particles[i3];
                p3.mesh.material.opacity = 0.8;
                var a3 = p3.startAngle + time * p3.spiralSpeed * (1 - clusterStrength * 0.7);
                var freeRadius = 0.75 * (1 - clusterStrength * 0.5);
                var freeX = ox + Math.cos(a3) * freeRadius + 0.3;
                var freeY = oy + Math.sin(a3) * freeRadius * 0.6;
                var freeZ = Math.sin(a3) * freeRadius * 0.2;

                // Lerp toward target
                p3.mesh.position.set(
                    freeX + (p3.targetX - freeX) * clusterStrength,
                    freeY + (p3.targetY - freeY) * clusterStrength,
                    freeZ + (p3.targetZ - freeZ) * clusterStrength
                );
                p3.mesh.scale.setScalar(0.7 + Math.sin(time * 3 + i3) * 0.15 * (1 - clusterStrength));
            }

            // Wireframe starts appearing
            if (t3 > 0.5) {
                var wfT = (t3 - 0.5) / 0.5;
                this._wireframe.scale.setScalar(wfT * 0.3);
                this._wireframe.material.opacity = wfT * 0.3;
                this._wireframe.rotation.y = time * 0.5;
            }

            model.scale.setScalar(this._origScale.x * (1 + Math.sin(time * 2) * 0.02));
        } else if (progress < 0.75) {
            // Phase 4: Shape outline visible, particles filling in
            var t4 = (progress - 0.55) / 0.20;

            for (var i4 = 0; i4 < this._particles.length; i4++) {
                var p4 = this._particles[i4];
                // Particles at target positions with gentle drift
                p4.mesh.position.set(
                    p4.targetX + Math.sin(time * 2 + p4.phase) * 0.02 * (1 - t4),
                    p4.targetY + Math.cos(time * 1.5 + p4.phase) * 0.02 * (1 - t4),
                    p4.targetZ + Math.sin(time * 1.8 + p4.phase) * 0.01 * (1 - t4)
                );
                p4.mesh.material.opacity = 0.8 + t4 * 0.15;
                p4.mesh.material.color.setHex(0xaaddff);
            }

            this._wireframe.scale.setScalar(1.0);
            this._wireframe.material.opacity = 0.3 + t4 * 0.5;
            this._wireframe.rotation.y = time * 0.8;

            model.scale.copy(this._origScale);
        } else if (progress < 0.88) {
            // Phase 5: Solidification flash
            var t5 = (progress - 0.75) / 0.13;

            this._wireframe.material.opacity = 0.8;
            this._wireframe.rotation.y = time * 0.8;

            // Solidification glow
            if (t5 < 0.4) {
                var glowT = t5 / 0.4;
                this._solidGlow.scale.setScalar(glowT * 1.5);
                this._solidGlow.material.opacity = glowT * 0.5;
            } else {
                var fadeT = (t5 - 0.4) / 0.6;
                this._solidGlow.scale.setScalar(1.5 + fadeT * 0.5);
                this._solidGlow.material.opacity = 0.5 * (1 - fadeT);
            }

            // Particles merge into wireframe
            for (var i5 = 0; i5 < this._particles.length; i5++) {
                var p5 = this._particles[i5];
                p5.mesh.material.opacity = (1 - t5) * 0.95;
                p5.mesh.scale.setScalar((1 - t5) * 0.8);
            }

            model.scale.copy(this._origScale);
        } else {
            // Phase 6: Manifested shape pulses, fades
            var t6 = (progress - 0.88) / 0.12;

            this._wireframe.material.opacity = 0.8 * (1 - t6);
            this._wireframe.rotation.y = time * 0.8;
            this._wireframe.scale.setScalar(1.0 + t6 * 0.3);

            this._solidGlow.material.opacity = 0;

            for (var i6 = 0; i6 < this._particles.length; i6++) {
                this._particles[i6].mesh.visible = false;
            }

            model.position.copy(this._origPos);
            model.scale.copy(this._origScale);
            model.rotation.z = 0;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._particles) { this._particles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._wireframe) {
            scene.remove(this._wireframe);
            this._wireframe.geometry.dispose();
            this._wireframe.material.dispose();
        }
        if (this._boxGeoRef) { this._boxGeoRef.dispose(); }
        if (this._solidGlow) { scene.remove(this._solidGlow); this._solidGlow.geometry.dispose(); this._solidGlow.material.dispose(); }
        this._particles = this._wireframe = this._boxGeoRef = this._solidGlow = null;
    }
};
