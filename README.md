# Zyro-Checker 🔍

**Zyro-Checker** (formerly Jar Checker) is an advanced local web-based tool for Minecraft players and server administrators to rapidly decompile and analyze `.jar` mods for malicious code, malware, or token loggers. 

The application uses CFR under the hood to completely decompile obfuscated mods, and then acts as a powerful front-end workspace to review the java files. It actively scans for dangerous patterns, attempts to deobfuscate hidden Base64 or Byte arrays (so you don't have to), and allows you to copy or export specific code modules directly to AI tools like ChatGPT or Claude for immediate audits.

---

## ✨ Features

- **Drag & Drop Workspace**: Upload your suspicious `.jar` files via a clean, cyber-punk aesthetic interface.
- **Decompilation Engine**: Powered by the CFR decompiler running with multi-threading optimizations for rapid unpacking.
- **Smart Highlighting**: Automatically flags "Suspect" modules that use capabilities like `Runtime.getRuntime().exec` (command execution), `java.net.*` (network connections), or file I/O operations. Code containing these calls is deeply highlighted in red.
- **Auto De-Obfuscator**: Finds and attempts to instantly decode `Base64` and hardcoded `byte[]` arrays, leaving warning comments showing the hidden URLs right in the code!
- **AI Prompt Generation**: Just select the files you are suspicious of, and the app will generate a ready-to-use prompt strictly formatting your decompiled files for AI models.
- **.TXT Prompt Dump**: If you select too many classes that break clipboard limits, you can easily download the prompt as a `.txt` file and simply drop it into ChatGPT.
- **Bilingual**: Fully supported in **English** and **Polish**.

---

## 🚀 How to Install and Run Locally

1. **Prerequisites**
   - You need to have [Node.js](https://nodejs.org/) installed on your machine.
   - You need to have `java` installed and available in your system path (Java 8+ recommended, needed for CFR).

2. **Clone the repository**
   ```bash
   git clone https://github.com/Fami-PL/Zyro-Checker.git
   cd Zyro-Checker
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start the server**
   ```bash
   node server.js
   ```

5. **Open the interface**
   - Open your web browser and go to: **[http://localhost:3000](http://localhost:3000)**

---

## 🤔 How to Use

1. **Upload**: Drag your `fabric/forge/neoforge` `.jar` file into the designated box on the webpage.
2. **Wait for Decompilation**: The tool will use CFR to recover the code.
3. **Analyze**: Browse the left sidebar. Any file colored in **red** is worth noting. Click a suspect file and read its source. The tool will auto-highlight the most dangerous methods in vivid red blocks.
4. **AI Output**: Checked off modules you find weird? Click `"💾 Download .TXT (selected)"` or `"✨ Copy Prompt"` and feed it to AI for a deep security summary.

---

## 📝 About

This project was built to fight back against the wave of infected `.jar` files targeting the Minecraft community (such as credential accessors, ratters, and Discord token loggers hidden inside seemingly innocent performance or UI mods). With Zyro-Checker, users can demystify the Java bytecode within seconds using robust web technologies.

*Disclaimer: This tool assists in reverse-engineering but does not replace the judgment of an expert.*

---
**Maintained by Fami-PL.**