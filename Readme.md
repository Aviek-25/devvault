# 🔐 DevVault

### Your Code. One Vault. Zero Clutter. ✦

DevVault is a modern, cloud-based code snippet manager designed to help developers save, organize, search, and manage reusable code in one place. With secure authentication, cloud storage, and an integrated Monaco Editor, DevVault makes managing code snippets simple and efficient.

## ✨ Features

- 🔐 **Secure Authentication** — Sign in with email and password or Google.
- ☁️ **Cloud Storage** — Store snippets securely using Cloud Firestore.
- 💻 **Monaco Editor** — Write and edit code with a powerful editor.
- 📁 **Collections** — Organize snippets into collections.
- 🏷️ **Tags** — Categorize snippets for easier organization.
- 🔎 **Advanced Search** — Find code snippets quickly.
- 📝 **Snippet Management** — Create, edit, and delete snippets.
- 🕒 **Timestamps** — Track when snippets are created or updated.
- 🔒 **User Data Isolation** — Restrict snippet access using Firestore security rules.
- 📱 **Responsive UI** — Access DevVault across different screen sizes.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Application framework |
| React | User interface |
| TypeScript | Type-safe development |
| Tailwind CSS | Styling |
| Firebase Authentication | User authentication |
| Cloud Firestore | Cloud database |
| Monaco Editor | Code editing |
| Motion | UI animations |
| Lucide React | Icons |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- npm
- A Firebase project

### 1. Clone the repository

```bash
git clone https://github.com/Aviek-25/devvault.git
```

### 2. Navigate to the project

```bash
cd devvault
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure Firebase

Create a project in the [Firebase Console](https://console.firebase.google.com/).

Enable the following services:

- **Authentication:** Enable Email/Password and Google sign-in.
- **Cloud Firestore:** Create a database and configure security rules.

### 5. Set up environment variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Replace the placeholder values with the configuration from your Firebase web app. Ensure the variable names match those used in `src/lib/firebase.ts`.

**Security note:** Never commit `.env.local` to GitHub. Protect user data with properly configured Firebase Authentication and Firestore security rules.

### 6. Run the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔒 Firestore Security

DevVault uses Firebase Authentication and Firestore rules to restrict access to each user's snippets.

Example rules for the current user-specific snippet structure:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/snippets/{snippetId} {
      allow read, create, update, delete:
        if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

These rules protect documents under each user's snippet path. Add and test appropriate rules for any additional collections you introduce.

## 📂 Project Structure

```text
devvault/
├── public/
├── src/
│   ├── app/
│   │   ├── login/
│   │   ├── firestore-test/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   └── lib/
│       └── firebase.ts
├── package.json
├── package-lock.json
└── README.md
```

*Note: Your actual project may contain additional files.*

## 🔮 Future Improvements

- 🔗 Public and private snippet sharing
- 📤 Import and export snippets
- ⭐ Favorite and pin snippets
- 📋 One-click code copying
- 🎨 Theme customization
- 🧩 Support for more programming languages
- ⌨️ Editor shortcuts and customization

## 🎯 Project Goal

DevVault aims to give developers a centralized and convenient workspace for storing reusable code, staying organized, and improving productivity.


## 📄 License

MIT
