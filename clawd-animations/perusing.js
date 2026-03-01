export default {
    name: 'Perusing',
    label: 'perusing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Floating page/card shapes (thin flat boxes) arranged in a spread
        this._pages = [];
        var pageGeo = new THREE.BoxGeometry(0.1, 0.13, 0.005);
        var pageColors = [0x8899aa, 0x7788aa, 0x6688aa, 0x5577aa, 0x7799bb, 0x668899, 0x5588aa, 0x779988];
        for (var i = 0; i < 8; i++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: pageColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var page = new THREE.Mesh(pageGeo, pMat);
            page.visible = false;
            scene.add(page);

            var spreadAngle = -0.8 + (i / 7) * 1.6;
            var spreadDist = 0.35;
            this._pages.push({
                mesh: page,
                x: ox + Math.sin(spreadAngle) * spreadDist,
                y: oy + 0.1 + Math.cos(spreadAngle) * 0.08,
                examined: false,
                examineTime: 0,
                bookmarked: false,
                tilt: (Math.random() - 0.5) * 0.3
            });
        }

        // Scanning line (thin box that sweeps across each page)
        var scanGeo = new THREE.BoxGeometry(0.09, 0.003, 0.001);
        var scanMat = new THREE.MeshBasicMaterial({
            color: 0x44aaff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._scanLine = new THREE.Mesh(scanGeo, scanMat);
        this._scanLine.visible = false;
        scene.add(this._scanLine);

        // Bookmark particles (small triangles on interesting finds)
        this._bookmarks = [];
        var bmGeo = new THREE.BufferGeometry();
        var bmVerts = new Float32Array([0, 0.02, 0, -0.01, -0.01, 0, 0.01, -0.01, 0]);
        bmGeo.setAttribute('position', new THREE.BufferAttribute(bmVerts, 3));
        for (var b = 0; b < 4; b++) {
            var bmMat = new THREE.MeshBasicMaterial({
                color: b % 2 === 0 ? 0xffaa44 : 0xff6644,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var bm = new THREE.Mesh(bmGeo.clone(), bmMat);
            bm.visible = false;
            scene.add(bm);
            this._bookmarks.push({
                mesh: bm,
                placed: false,
                pageIdx: -1
            });
        }
        this._bmIdx = 0;

        // Page highlight glow (on currently examined page)
        var hlGeo = new THREE.BoxGeometry(0.12, 0.15, 0.001);
        var hlMat = new THREE.MeshBasicMaterial({
            color: 0x88bbff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._highlight = new THREE.Mesh(hlGeo, hlMat);
        this._highlight.visible = false;
        scene.add(this._highlight);

        // Library ambient glow
        var glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x667788, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy + 0.05, -0.05);
        scene.add(this._glow);

        this._currentPage = -1;
        this._examineStart = 0;
        this._scanPhase = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Pages fan out from center
            var t = progress / 0.10;
            for (var i = 0; i < 8; i++) {
                this._pages[i].mesh.visible = true;
                var spread = t;
                this._pages[i].mesh.position.set(
                    ox + (this._pages[i].x - ox) * spread,
                    oy + 0.1 + (this._pages[i].y - oy - 0.1) * spread,
                    0
                );
                this._pages[i].mesh.material.opacity = t * 0.4;
                this._pages[i].mesh.rotation.y = this._pages[i].tilt * t;
                this._pages[i].mesh.rotation.z = ((i - 3.5) / 7) * 0.15 * t;
            }
            this._glow.material.opacity = t * 0.03;
            model.position.set(ox, oy, oz);
        } else if (progress < 0.75) {
            // Phase 2: Model moves between pages, examining each
            var t2 = (progress - 0.10) / 0.65;
            var pageIdx = Math.min(7, Math.floor(t2 * 8));

            // Switch to new page
            if (pageIdx !== this._currentPage) {
                this._currentPage = pageIdx;
                this._examineStart = time;
                this._scanPhase = 0;
                this._pages[pageIdx].examined = true;
                this._pages[pageIdx].examineTime = time;
            }

            // Highlight current page
            var cp = this._pages[this._currentPage];
            this._highlight.visible = true;
            this._highlight.position.set(cp.x, cp.y, 0.01);
            this._highlight.material.opacity = 0.15 + Math.sin(time * 4) * 0.05;
            this._highlight.rotation.y = cp.tilt;
            this._highlight.rotation.z = cp.mesh.rotation.z;

            // Scanning line sweeps across current page
            this._scanLine.visible = true;
            this._scanPhase += delta * 3;
            var scanY = cp.y - 0.06 + (Math.sin(this._scanPhase) * 0.5 + 0.5) * 0.12;
            this._scanLine.position.set(cp.x, scanY, 0.02);
            this._scanLine.material.opacity = 0.5 + Math.sin(time * 6) * 0.15;

            // Light up examined pages
            for (var j = 0; j < 8; j++) {
                var p = this._pages[j];
                p.mesh.position.set(p.x, p.y + Math.sin(time * 1 + j * 0.5) * 0.003, 0);
                if (j === this._currentPage) {
                    p.mesh.material.opacity = 0.6 + Math.sin(time * 3) * 0.1;
                    p.mesh.scale.setScalar(1.1);
                } else if (p.examined) {
                    p.mesh.material.opacity = 0.5;
                    p.mesh.scale.setScalar(1.0);
                } else {
                    p.mesh.material.opacity = 0.3;
                    p.mesh.scale.setScalar(1.0);
                }
            }

            // Place bookmark on interesting pages
            var bookmarkPages = [1, 3, 5, 7];
            for (var bi = 0; bi < bookmarkPages.length; bi++) {
                var bpi = bookmarkPages[bi];
                if (this._pages[bpi].examined && !this._pages[bpi].bookmarked && this._bmIdx < 4) {
                    this._pages[bpi].bookmarked = true;
                    var bm = this._bookmarks[this._bmIdx];
                    this._bmIdx++;
                    bm.placed = true;
                    bm.pageIdx = bpi;
                    bm.mesh.visible = true;
                }
            }

            // Model moves toward current page
            var targetX = cp.x * 0.3 + ox * 0.7;
            model.position.set(
                targetX,
                oy + Math.sin(time * 1.2) * 0.003,
                oz
            );
            model.rotation.z = (cp.x - ox) * 0.05;

            this._glow.material.opacity = 0.05 + Math.sin(time * 1.5) * 0.02;
        } else if (progress < 0.88) {
            // Phase 3: All pages examined, bookmarked ones glow
            var t3 = (progress - 0.75) / 0.13;
            this._scanLine.visible = false;
            this._highlight.material.opacity = 0.15 * (1 - t3);

            for (var k = 0; k < 8; k++) {
                var pk = this._pages[k];
                if (pk.bookmarked) {
                    pk.mesh.material.opacity = 0.6 + Math.sin(time * 3 + k) * 0.1;
                } else {
                    pk.mesh.material.opacity = 0.4 * (1 - t3 * 0.5);
                }
            }

            model.position.set(ox, oy, oz);
            model.rotation.z = model.rotation.z * (1 - t3 * 0.5);
        } else {
            // Phase 4: Fade out
            var t4 = (progress - 0.88) / 0.12;
            for (var l = 0; l < 8; l++) {
                this._pages[l].mesh.material.opacity *= (1 - t4 * 0.07);
            }
            for (var bj = 0; bj < this._bookmarks.length; bj++) {
                this._bookmarks[bj].mesh.material.opacity *= (1 - t4 * 0.07);
            }
            this._highlight.material.opacity = 0;
            this._glow.material.opacity = 0.05 * (1 - t4);

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update bookmark positions (top-right of their page)
        for (var bk = 0; bk < this._bookmarks.length; bk++) {
            var bmk = this._bookmarks[bk];
            if (!bmk.placed) continue;
            var bPage = this._pages[bmk.pageIdx];
            bmk.mesh.position.set(bPage.mesh.position.x + 0.04, bPage.mesh.position.y + 0.06, 0.02);
            bmk.mesh.material.opacity = 0.7 + Math.sin(time * 2 + bk) * 0.1;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pages) {
            this._pages.forEach(function(p) {
                scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
            });
        }
        if (this._bookmarks) {
            this._bookmarks.forEach(function(b) {
                scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose();
            });
        }
        if (this._scanLine) { scene.remove(this._scanLine); this._scanLine.geometry.dispose(); this._scanLine.material.dispose(); }
        if (this._highlight) { scene.remove(this._highlight); this._highlight.geometry.dispose(); this._highlight.material.dispose(); }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._pages = this._bookmarks = this._scanLine = this._highlight = this._glow = null;
    }
};
