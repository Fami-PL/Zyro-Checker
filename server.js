const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const port = 3000;

// Config
const uploadDir = path.join(__dirname, 'uploads');
const decompileDir = path.join(__dirname, 'decompiled');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(decompileDir)) fs.mkdirSync(decompileDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.use(express.static('public'));
app.use(express.json());

// Recursively get all .java files
function getAllJavaFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllJavaFiles(filePath, fileList);
        } else if (filePath.endsWith('.java')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

app.post('/api/decompile', upload.single('modFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Brak pliku do dekompilacji. (No file uploaded)' });
    }

    const jarPath = req.file.path;
    const outputId = path.basename(jarPath, '.jar');
    const outputDir = path.join(decompileDir, outputId);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Determine available threads, fallback to 4 if cannot detect
    const availableThreads = os.cpus().length || 4;

    // Run CFR to decompile with obfuscation recovery and multi-threading
    // Not all CFR versions fully support all threading arguments, but specifying --threads or using jar parameters might help if the decompiler utilizes it. 
    // In standard CFR, you cannot always parallelize with a single flag for exact file counts, but modern Java/CFR versions can be prompted.
    // For large JARs, --silent true and allowing maxBuffer are critical.
    let command = `java -jar "${path.join(__dirname, 'cfr.jar')}" "${jarPath}" --outputdir "${outputDir}" --rename true --recover true --silent true`;

    exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
        try {
            if (error) {
                console.error("CFR Error:", error);
                // continue anyway, CFR sometimes exits with non-zero but still decompiles successfully
            }

            const javaFiles = getAllJavaFiles(outputDir);
            let filesArray = [];

            // Suspect keywords and patterns (including Base64 decoders)
            const suspectRegex = /java\.net|URL|URLConnection|HttpURLConnection|Socket|ProcessBuilder|Runtime\.getRuntime\(\)\.exec|System\.loadLibrary|ClassLoader|Base64\.getDecoder|Cipher\.getInstance|Files\.write|FileOutputStream|crypto/i;

            // Regex to find potential Base64 strings (long gibberish)
            const base64Regex = /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
            // Regex for hardcoded byte arrays
            const byteArrayRegex = /new\s+byte\s*\[\s*\]\s*\{([0-9\s,-]+)\}/g;

            for (const file of javaFiles) {
                // Limit size per file just in case
                let content = '';
                try {
                    content = fs.readFileSync(file, 'utf8');
                    // Trim if extremely large file
                    if (content.length > 500000) {
                        content = content.substring(0, 500000) + '\n// ... [File too large, truncated] ...';
                    }
                } catch (e) {
                    continue;
                }

                const relPath = path.relative(outputDir, file);

                // Advanced Detection: try to decode Base64 strings found in the file
                let dynamicDecodedInfo = "";
                let base64Match;
                while ((base64Match = base64Regex.exec(content)) !== null) {
                    try {
                        const decodedStr = Buffer.from(base64Match[0], 'base64').toString('ascii');
                        // if the decoded string looks like text, a URL, or an IP address
                        if (/^[a-zA-Z0-9$_.+!*'(),;:/?@=&<>\[\]\{\}|\\^~%#-]+$/.test(decodedStr) && decodedStr.length > 5) {
                            dynamicDecodedInfo += `\n// [AUTO-ANALYSIS] Possible hidden Base64 string decoded: "${decodedStr}"`;
                        }
                    } catch (err) { }
                }

                // Advanced Detection: Decrypt hardcoded byte arrays
                let byteArrayMatch;
                while ((byteArrayMatch = byteArrayRegex.exec(content)) !== null) {
                    try {
                        const bytes = byteArrayMatch[1].split(',').map(b => parseInt(b.trim()));
                        const decodedStr = Buffer.from(bytes).toString('utf8');
                        if (/[a-zA-Z0-9:/\.]{5,}/.test(decodedStr)) {
                            dynamicDecodedInfo += `\n// [AUTO-ANALYSIS] Possible hidden byte[] string decoded: "${decodedStr}"`;
                        }
                    } catch (err) { }
                }

                if (dynamicDecodedInfo.length > 0) {
                    content += `\n/* \n======= AI ASSISTANT WARNING =======\nAutomated analysis detected obfuscation.\n${dynamicDecodedInfo}\n======================================\n*/\n`;
                }

                // Consider it suspect if it hits the original Regex OR has discovered obfuscated strings 
                const isSuspect = suspectRegex.test(content) || dynamicDecodedInfo.length > 0;

                filesArray.push({
                    path: relPath,
                    content: content,
                    suspect: isSuspect
                });
            }

            // Optional: sort so suspect files are at the top
            filesArray.sort((a, b) => b.suspect - a.suspect || a.path.localeCompare(b.path));

            // To prevent crashing from extremely large mods, we could limit total files,
            // but for selecting we want all if possible. We cap at max 2000 files to avoid Node OOM.
            if (filesArray.length > 2000) {
                filesArray = filesArray.slice(0, 2000);
            }

            res.json({ success: true, files: filesArray });

            // Cleanup after sending response
            if (fs.existsSync(jarPath)) fs.unlinkSync(jarPath);
            fs.rm(outputDir, { recursive: true, force: true }, () => { });

        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Wystąpił błąd podczas przetwarzania plików. (Error processing files)' });
        }
    });
});

app.listen(port, () => {
    console.log(`Zyro-Checker backend is running at http://localhost:${port}`);
});
