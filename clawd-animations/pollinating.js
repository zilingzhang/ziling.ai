export default {
    name: 'Pollinating',
    label: 'pollinating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var leftX = this._origPos.x - 0.8;
        var rightX = this._origPos.x + 0.8;
        var groundY = this._origPos.y - 0.4;

        // Flower 1 (left) - sphere head on stem cylinder
        this._flower1Group = new THREE.Group();
        var stem1Geo = new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6);
        var stem1Mat = new THREE.MeshBasicMaterial({ color: 0x33aa22, transparent: true, opacity: 0 });
        this._stem1 = new THREE.Mesh(stem1Geo, stem1Mat);
        this._stem1.position.set(0, 0.25, 0);
        this._flower1Group.add(this._stem1);

        var head1Geo = new THREE.SphereGeometry(0.08, 8, 8);
        var head1Mat = new THREE.MeshBasicMaterial({ color: 0xff6699, transparent: true, opacity: 0 });
        this._head1 = new THREE.Mesh(head1Geo, head1Mat);
        this._head1.position.set(0, 0.55, 0);
        this._flower1Group.add(this._head1);

        // Petal ring around head1
        this._petals1 = [];
        for (var p1 = 0; p1 < 5; p1++) {
            var p1Geo = new THREE.CircleGeometry(0.04, 6);
            var p1Mat = new THREE.MeshBasicMaterial({ color: 0xff88bb, transparent: true, opacity: 0, side: THREE.DoubleSide });
            var petal1 = new THREE.Mesh(p1Geo, p1Mat);
            var angle1 = (p1 / 5) * Math.PI * 2;
            petal1.position.set(Math.cos(angle1) * 0.09, 0.55 + Math.sin(angle1) * 0.09, 0.01);
            this._flower1Group.add(petal1);
            this._petals1.push(petal1);
        }

        this._flower1Group.position.set(leftX, groundY, 0);
        this._flower1Group.scale.setScalar(0.01);
        scene.add(this._flower1Group);

        // Flower 2 (right) - different color
        this._flower2Group = new THREE.Group();
        var stem2Geo = new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6);
        var stem2Mat = new THREE.MeshBasicMaterial({ color: 0x33aa22, transparent: true, opacity: 0 });
        this._stem2 = new THREE.Mesh(stem2Geo, stem2Mat);
        this._stem2.position.set(0, 0.25, 0);
        this._flower2Group.add(this._stem2);

        var head2Geo = new THREE.SphereGeometry(0.08, 8, 8);
        var head2Mat = new THREE.MeshBasicMaterial({ color: 0x7766ee, transparent: true, opacity: 0 });
        this._head2 = new THREE.Mesh(head2Geo, head2Mat);
        this._head2.position.set(0, 0.55, 0);
        this._flower2Group.add(this._head2);

        this._petals2 = [];
        for (var p2 = 0; p2 < 5; p2++) {
            var p2Geo = new THREE.CircleGeometry(0.04, 6);
            var p2Mat = new THREE.MeshBasicMaterial({ color: 0x9988ff, transparent: true, opacity: 0, side: THREE.DoubleSide });
            var petal2 = new THREE.Mesh(p2Geo, p2Mat);
            var angle2 = (p2 / 5) * Math.PI * 2;
            petal2.position.set(Math.cos(angle2) * 0.09, 0.55 + Math.sin(angle2) * 0.09, 0.01);
            this._flower2Group.add(petal2);
            this._petals2.push(petal2);
        }

        this._flower2Group.position.set(rightX, groundY, 0);
        this._flower2Group.scale.setScalar(0.01);
        scene.add(this._flower2Group);

        // Flower glow (additive, for receiving pollen)
        var glowGeo = new THREE.SphereGeometry(0.2, 8, 8);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._flower2Glow = new THREE.Mesh(glowGeo, glowMat);
        this._flower2Glow.position.set(rightX, groundY + 0.55, -0.05);
        scene.add(this._flower2Glow);

        // Pollen particles - tiny yellow spheres
        this._pollen = [];
        var pollenGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var pp = 0; pp < 25; pp++) {
            var ppMat = new THREE.MeshBasicMaterial({
                color: pp % 3 === 0 ? 0xffdd33 : (pp % 3 === 1 ? 0xffcc00 : 0xeecc22),
                transparent: true, opacity: 0
            });
            var pollenMesh = new THREE.Mesh(pollenGeo, ppMat);
            pollenMesh.visible = false;
            scene.add(pollenMesh);
            this._pollen.push({
                mesh: pollenMesh, active: false,
                state: 'idle', // idle, collecting, following, delivering, delivered
                offsetX: (Math.random() - 0.5) * 0.15,
                offsetY: (Math.random() - 0.5) * 0.15,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5
            });
        }

        // Golden trail line
        this._trailPoints = [];
        for (var tp = 0; tp < 20; tp++) {
            this._trailPoints.push(new THREE.Vector3(0, 0, 0));
        }
        var trailGeo = new THREE.BufferGeometry().setFromPoints(this._trailPoints);
        var trailMat = new THREE.LineBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0
        });
        this._trail = new THREE.Line(trailGeo, trailMat);
        scene.add(this._trail);
        this._trailActive = false;

        this._leftX = leftX;
        this._rightX = rightX;
        this._groundY = groundY;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var leftX = this._leftX;
        var rightX = this._rightX;
        var groundY = this._groundY;

        // Phase: Flowers grow (0-10%)
        if (progress < 0.10) {
            var growProg = progress / 0.10;
            var easeGrow = 1 - Math.pow(1 - growProg, 2);
            this._flower1Group.scale.setScalar(easeGrow);
            this._flower2Group.scale.setScalar(easeGrow * 0.9);
            this._setFlowerOpacity(this._flower1Group, easeGrow);
            this._setFlowerOpacity(this._flower2Group, easeGrow * 0.9);
            model.position.copy(orig);
        }
        // Phase: Model approaches first flower (10-25%)
        else if (progress < 0.25) {
            var approachProg = (progress - 0.10) / 0.15;
            this._flower1Group.scale.setScalar(1);
            this._flower2Group.scale.setScalar(0.9);
            this._setFlowerOpacity(this._flower1Group, 1);
            this._setFlowerOpacity(this._flower2Group, 0.9);

            // Move model toward flower 1
            var targetX = leftX + 0.15;
            var targetY = groundY + 0.55;
            var ease = 1 - Math.pow(1 - approachProg, 2);
            model.position.set(
                orig.x + (targetX - orig.x) * ease,
                orig.y + (targetY - orig.y) * ease * 0.3,
                orig.z
            );
            // Gentle bob
            model.position.y += Math.sin(time * 4) * 0.02;
        }
        // Phase: Pollen collects on model (25-40%)
        else if (progress < 0.40) {
            var collectProg = (progress - 0.25) / 0.15;
            model.position.set(leftX + 0.15, orig.y + (groundY + 0.55 - orig.y) * 0.3 + Math.sin(time * 4) * 0.02, orig.z);

            // Emit pollen from flower 1 that sticks to model
            var pollenToEmit = Math.floor(collectProg * 25);
            for (var pi = 0; pi < pollenToEmit && pi < this._pollen.length; pi++) {
                var p = this._pollen[pi];
                if (p.state === 'idle') {
                    p.state = 'collecting';
                    p.active = true;
                    p.mesh.visible = true;
                    // Start from flower head
                    p.mesh.position.set(leftX, groundY + 0.55, 0);
                }
                if (p.state === 'collecting') {
                    // Move toward model
                    var colEase = Math.min(collectProg * 2, 1);
                    p.mesh.position.x = leftX + (model.position.x - leftX) * colEase + p.offsetX * colEase;
                    p.mesh.position.y = (groundY + 0.55) + (model.position.y - (groundY + 0.55)) * colEase + p.offsetY * colEase;
                    p.mesh.material.opacity = 0.7 * colEase;
                    if (colEase >= 0.95) {
                        p.state = 'following';
                    }
                }
            }

            // Flower 1 slight shrink as pollen leaves
            this._head1.scale.setScalar(1 - collectProg * 0.15);
        }
        // Phase: Model travels to second flower, pollen trails (40-60%)
        else if (progress < 0.60) {
            var travelProg = (progress - 0.40) / 0.20;
            var ease2 = travelProg * travelProg * (3 - 2 * travelProg); // smoothstep

            // Model moves from left to right flower
            var fromX = leftX + 0.15;
            var toX = rightX - 0.15;
            var fromY = orig.y + (groundY + 0.55 - orig.y) * 0.3;
            var toY = orig.y + (groundY + 0.55 - orig.y) * 0.3;
            var arcY = 0.3; // arc height
            var mx = fromX + (toX - fromX) * ease2;
            var my = fromY + (toY - fromY) * ease2 + Math.sin(ease2 * Math.PI) * arcY;
            model.position.set(mx, my + Math.sin(time * 5) * 0.015, orig.z);

            // Pollen follows model
            for (var pi2 = 0; pi2 < this._pollen.length; pi2++) {
                var p2 = this._pollen[pi2];
                if (p2.state === 'following' || p2.state === 'collecting') {
                    p2.state = 'following';
                    var wobble = Math.sin(time * p2.speed * 5 + p2.phase) * 0.03;
                    p2.mesh.position.set(
                        model.position.x + p2.offsetX + wobble,
                        model.position.y + p2.offsetY + wobble * 0.5,
                        0
                    );
                    p2.mesh.material.opacity = 0.7;
                }
            }

            // Update trail
            this._trailActive = true;
            this._trail.material.opacity = 0.3;
            // Shift trail points
            for (var tp = this._trailPoints.length - 1; tp > 0; tp--) {
                this._trailPoints[tp].copy(this._trailPoints[tp - 1]);
            }
            this._trailPoints[0].set(mx, my, 0);
            this._trail.geometry.setFromPoints(this._trailPoints);
        }
        // Phase: Pollen delivered, second flower glows (60-75%)
        else if (progress < 0.75) {
            var deliverProg = (progress - 0.60) / 0.15;
            model.position.set(rightX - 0.15, orig.y + (groundY + 0.55 - orig.y) * 0.3 + Math.sin(time * 4) * 0.02, orig.z);

            // Pollen moves from model to flower 2
            for (var pi3 = 0; pi3 < this._pollen.length; pi3++) {
                var p3 = this._pollen[pi3];
                if (p3.state === 'following') {
                    p3.state = 'delivering';
                }
                if (p3.state === 'delivering') {
                    var delEase = Math.min(deliverProg * 2, 1);
                    p3.mesh.position.x = model.position.x + (rightX - model.position.x) * delEase + p3.offsetX * (1 - delEase);
                    p3.mesh.position.y = model.position.y + ((groundY + 0.55) - model.position.y) * delEase + p3.offsetY * (1 - delEase);
                    p3.mesh.material.opacity = 0.7 * (1 - delEase * 0.5);
                    if (delEase >= 0.95) {
                        p3.state = 'delivered';
                        p3.mesh.visible = false;
                    }
                }
            }

            // Flower 2 glow
            this._flower2Glow.material.opacity = deliverProg * 0.4;
            this._flower2Glow.scale.setScalar(1 + deliverProg * 0.5);
            this._head2.scale.setScalar(1 + deliverProg * 0.15);

            // Trail fades
            this._trail.material.opacity = 0.3 * (1 - deliverProg);
        }
        // Phase: Pollination complete, sparkle burst (75-88%)
        else if (progress < 0.88) {
            var burstProg = (progress - 0.75) / 0.13;

            // Model returns to center
            var returnEase = 1 - Math.pow(1 - burstProg, 2);
            model.position.set(
                rightX - 0.15 + (orig.x - (rightX - 0.15)) * returnEase,
                orig.y + (groundY + 0.55 - orig.y) * 0.3 * (1 - returnEase),
                orig.z
            );

            // Flower 2 glow pulses
            this._flower2Glow.material.opacity = 0.4 * (1 + Math.sin(time * 4) * 0.3) * (1 - burstProg * 0.5);
            this._flower2Glow.scale.setScalar(1.5 + Math.sin(time * 3) * 0.2);

            // Sparkle effect from remaining visible pollen
            for (var pi4 = 0; pi4 < this._pollen.length; pi4++) {
                var p4 = this._pollen[pi4];
                if (p4.state === 'delivered' && burstProg < 0.5) {
                    p4.mesh.visible = true;
                    p4.mesh.position.set(
                        rightX + Math.cos(time * p4.speed * 8 + p4.phase) * (0.1 + burstProg * 0.3),
                        groundY + 0.55 + Math.sin(time * p4.speed * 8 + p4.phase) * (0.1 + burstProg * 0.3),
                        0
                    );
                    p4.mesh.material.opacity = 0.5 * (1 - burstProg * 2);
                } else if (burstProg >= 0.5) {
                    p4.mesh.visible = false;
                }
            }

            this._trail.material.opacity = 0;
        }
        // Phase: Fade (88-100%)
        else {
            var fadeProg = (progress - 0.88) / 0.12;
            model.position.set(
                orig.x,
                orig.y,
                orig.z
            );
            var fadeOp = 1 - fadeProg;
            this._setFlowerOpacity(this._flower1Group, fadeOp);
            this._setFlowerOpacity(this._flower2Group, fadeOp);
            this._flower1Group.scale.setScalar(fadeOp);
            this._flower2Group.scale.setScalar(fadeOp * 0.9);
            this._flower2Glow.material.opacity = 0.2 * fadeOp;
            this._trail.material.opacity = 0;
            for (var pi5 = 0; pi5 < this._pollen.length; pi5++) {
                this._pollen[pi5].mesh.visible = false;
            }
        }
    },
    _setFlowerOpacity: function(group, opacity) {
        group.traverse(function(child) {
            if (child.isMesh && child.material) {
                child.material.opacity = opacity;
            }
        });
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._flower1Group) {
            this._flower1Group.traverse(function(child) {
                if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); }
            });
            scene.remove(this._flower1Group);
        }
        if (this._flower2Group) {
            this._flower2Group.traverse(function(child) {
                if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); }
            });
            scene.remove(this._flower2Group);
        }
        if (this._flower2Glow) { scene.remove(this._flower2Glow); this._flower2Glow.geometry.dispose(); this._flower2Glow.material.dispose(); }
        if (this._pollen) { this._pollen.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._trail) { scene.remove(this._trail); this._trail.geometry.dispose(); this._trail.material.dispose(); }
        this._flower1Group = this._flower2Group = this._flower2Glow = this._pollen = this._trail = null;
        this._stem1 = this._stem2 = this._head1 = this._head2 = this._petals1 = this._petals2 = null;
    }
};
