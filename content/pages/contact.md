---
title: "Contact"
slug: "contact"
date: "2024-08-08 16:48:59"
description: "Contact"
type: "page"
---

<!--
  Body intentionally empty. `/contact` is special-cased in
  app/[slug]/page.tsx and renders <ContactForm /> (posting to
  app/api/contact) — this file's content is never read.

  It stays here only so the slug is present in getAllPages(), which
  next.config.ts uses to decide which legacy /<slug> URLs to redirect.

  The previous body was the exported WPForms markup: a <form> POSTing to
  /wp-admin/admin-ajax.php with a stale nonce, plus an <img> pointing at
  /wp-content/plugins/... Neither path exists on this site.
-->
