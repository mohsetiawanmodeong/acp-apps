# Simpan directory sekarang dalam variabel
NODE12_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/nodejs12"

# Buat alias dengan path yang lengkap
alias node="\"$NODE12_DIR/node.exe\""
alias npm="\"$NODE12_DIR/npm.cmd\""

# Tampilkan info
echo "Node.js path: $NODE12_DIR"
echo "Node.js version: $("$NODE12_DIR/node.exe" -v)"
