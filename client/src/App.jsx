import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Users,
  Send,
  CheckCircle,
  LogOut,
  BookOpen,
  UserRound,
  RefreshCw,
  LoaderCircle,
  Pencil,
  X,
  Bell,
} from "lucide-react";
import { apiRequest } from "./api";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [people, setPeople] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reviewRatings, setReviewRatings] = useState({});
  const [reviewComments, setReviewComments] = useState({});
  const [exchangeReviews, setExchangeReviews] = useState({});
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "", bio: "", location: "", experienceLevel: "Beginner",
    skillsToTeach: "", skillsToLearn: "",
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // async function loadDashboard() {
  //   setError("");
  //   try {
  //     const me = await apiRequest("/auth/me");
  //     const currentUser = me.user || me;
  //     setUser(currentUser);
      async function loadDashboard() {
  try {
    const me = await apiRequest("/auth/me");
    setError("");

    const currentUser = me.user || me;
    setUser(currentUser);

      const [usersResult, exchangesResult] = await Promise.all([
        apiRequest("/users"),
        apiRequest("/exchanges"),
      ]);

      setPeople(
        Array.isArray(usersResult) ? usersResult : usersResult.users || [],
      );

      // setRequests(
      //   Array.isArray(exchangesResult)
      //     ? exchangesResult
      //     : exchangesResult.exchanges || [],
      // );

      const exchangeList = Array.isArray(exchangesResult)
        ? exchangesResult
        : exchangesResult.exchanges || [];

      setRequests(exchangeList);
      await loadExchangeReviews(exchangeList);
    } catch (err) {
      setUser(null);
      setError(err.message || "Please log in to continue.");
    } finally {
      setLoading(false);
    }
  }


useEffect(() => {
  let cancelled = false;

  async function initializeDashboard() {
    try {
      const me = await apiRequest("/auth/me");
      const currentUser = me.user || me;

      const [usersResult, exchangesResult] = await Promise.all([
        apiRequest("/users"),
        apiRequest("/exchanges"),
      ]);

      const peopleList = Array.isArray(usersResult)
        ? usersResult
        : usersResult.users || [];

      const exchangeList = Array.isArray(exchangesResult)
        ? exchangesResult
        : exchangesResult.exchanges || [];

      const completedExchanges = exchangeList.filter(
        (exchange) => exchange.status === "Completed",
      );

      const reviewResults = await Promise.all(
        completedExchanges.map(async (exchange) => {
          try {
            const result = await apiRequest(
              `/exchanges/${exchange._id}/reviews`,
            );

            const reviews = Array.isArray(result)
              ? result
              : Array.isArray(result.reviews)
                ? result.reviews
                : [];

            return [exchange._id, reviews];
          } catch {
            return [exchange._id, []];
          }
        }),
      );

      if (cancelled) return;

      setError("");
      setUser(currentUser);
      setPeople(peopleList);
      setRequests(exchangeList);
      setExchangeReviews(Object.fromEntries(reviewResults));
    } catch (err) {
      if (cancelled) return;

      setUser(null);
      setError(err.message || "Please log in to continue.");
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void initializeDashboard();

  return () => {
    cancelled = true;
  };
}, []);
  async function handleAuth(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";

      const result = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (mode === "register" && !result.user) {
        setMode("login");
        setMessage("Account created. Please log in.");
      } else {
        await loadDashboard();
      }
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  // async function refreshRequests() {
  //   const result = await apiRequest("/exchanges");

  //   setRequests(Array.isArray(result) ? result : result.exchanges || []);
  // }

  async function refreshRequests() {
    const result = await apiRequest("/exchanges");
    console.log("Exchange API result:", result);
    const exchangeList = Array.isArray(result)
      ? result
      : result.exchanges || [];
    console.log(
      "Exchange statuses:",
      exchangeList.map((r) => ({
        id: r._id,
        status: r.status,
        requester: r.requester,
        receiver: r.receiver,
      })),
    );

    setRequests(exchangeList);
    await loadExchangeReviews(exchangeList);
  }

  async function loadExchangeReviews(exchangeList) {
    const completedExchanges = exchangeList.filter(
      (exchange) => exchange.status === "Completed",
    );

    const results = await Promise.all(
      completedExchanges.map(async (exchange) => {
        try {
          const result = await apiRequest(`/exchanges/${exchange._id}/reviews`);

          // return [exchange._id, result.reviews || result];
          const reviews = Array.isArray(result)
            ? result
            : Array.isArray(result.reviews)
              ? result.reviews
              : [];

          return [exchange._id, reviews];
        } catch {
          return [exchange._id, []];
        }
      }),
    );

    setExchangeReviews(Object.fromEntries(results));
  }
  async function submitReview(exchangeId, rating, comment) {
    if (!comment.trim()) {
      alert("Please write a comment.");

      return;
    }

    try {
      await apiRequest(`/exchanges/${exchangeId}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating: Number(rating),
          comment: comment.trim(),
        }),
      });

      alert("Review submitted successfully!");

      await loadExchangeReviews(requests);

      setReviewComments((prev) => ({
        ...prev,
        [exchangeId]: "",
      }));
    } catch (error) {
      alert(error.message || "Could not submit review");
    }
  }

  async function sendRequest(person) {
    setMessage("");
    setError("");

    const teach = window.prompt(
      `What skill would you like to teach ${person.name || "this user"}?`,
    );

    if (!teach?.trim()) return;

    const learn = window.prompt("What skill do you want to learn?");

    if (!learn?.trim()) return;

    setBusy(true);

    try {
      const result = await apiRequest("/exchanges", {
        method: "POST",
        body: JSON.stringify({
          receiver: person._id || person.id,
          skillOffered: teach.trim(),
          skillWanted: learn.trim(),
          message: `I'd like to exchange ${teach.trim()} for ${learn.trim()}.`,
        }),
      });

      setMessage(result.message || "Exchange request sent successfully!");
      await refreshRequests();
    } catch (err) {
      setError(err.message || "Could not send exchange request.");
    } finally {
      setBusy(false);
    }
  }

  async function acceptRequest(request) {
    setMessage("");
    setError("");
    setBusy(true);

    try {
      const id = request._id || request.id;

      const result = await apiRequest(`/exchanges/${id}/accept`, {
        method: "PATCH",
      });

      setMessage(result.message || "Request accepted!");
      await refreshRequests();
    } catch (err) {
      setError(err.message || "Could not accept request.");
    } finally {
      setBusy(false);
    }
  }

  // Reject exchange request
  async function rejectRequest(request) {
    const confirmed = window.confirm(
      "Are you sure you want to reject this exchange request?",
    );

    if (!confirmed) return;

    setMessage("");
    setError("");
    setBusy(true);

    try {
      const id = request._id || request.id;

      const result = await apiRequest(`/exchanges/${id}/reject`, {
        method: "PATCH",
      });

      setMessage(result.message || "Request rejected successfully!");
      await refreshRequests();
    } catch (err) {
      setError(err.message || "Could not reject request.");
    } finally {
      setBusy(false);
    }
  }

  function openProfileEditor() {
    setProfileForm({
      name: user?.name || "",
      bio: user?.bio || "",
      location: user?.location || "",
      experienceLevel: user?.experienceLevel || "Beginner",
      skillsToTeach: (user?.skillsToTeach || []).join(", "),
      skillsToLearn: (user?.skillsToLearn || []).join(", "),
    });
    setProfileOpen(true);
    setError("");
    setMessage("");
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileBusy(true);
    setError("");
    setMessage("");
    const toSkills = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
    try {
      const result = await apiRequest("/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          name: profileForm.name.trim(),
          bio: profileForm.bio.trim(),
          location: profileForm.location.trim(),
          experienceLevel: profileForm.experienceLevel,
          skillsToTeach: toSkills(profileForm.skillsToTeach),
          skillsToLearn: toSkills(profileForm.skillsToLearn),
        }),
      });
      const updatedUser = result.user || result;
      setUser(updatedUser);
      setPeople((prev) => prev.map((person) => String(person._id || person.id) === String(updatedUser._id || updatedUser.id) ? updatedUser : person));
      setProfileOpen(false);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update profile.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function logout() {
    setMessage("");
    setError("");

    try {
      await apiRequest("/auth/logout", { method: "POST" });
      setUser(null);
      setPeople([]);
      setRequests([]);
    } catch (err) {
      setError(err.message || "Logout failed.");
    }
  }

  const currentUserId = String(user?._id || user?.id || "");

  const filteredPeople = people.filter((person) => {
    const personId = String(person._id || person.id || "");

    const text = [
      person.name,
      person.email,
      person.bio,
      ...(person.skillsToTeach || []),
      ...(person.skillsToLearn || []),
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase()) && personId !== currentUserId;
  });

  if (loading) {
    return (
      <main className="app-shell">
        <p>
          <LoaderCircle size={18} /> Loading SkillSwap...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand">
            <BookOpen /> SkillSwap
          </div>

          <h1>{mode === "login" ? "Welcome back!" : "Join SkillSwap"}</h1>
          <p>Share what you know. Learn something new.</p>

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          <form onSubmit={handleAuth}>
            {mode === "register" && (
              <input
                required
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}

            <input
              required
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input
              required
              type="password"
              minLength={8}
              placeholder="Password (at least 8 characters)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <button disabled={busy} type="submit">
              {busy
                ? "Please wait..."
                : mode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>

          <button
            className="text-button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setMessage("");
            }}
          >
            {mode === "login"
              ? "New here? Create an account"
              : "Already registered? Log in"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <BookOpen /> SkillSwap
        </div>

        <div className="user-menu">
          <button className="icon-button" onClick={() => setNotificationsOpen((open) => !open)} title="Activity notifications" aria-label="Activity notifications">
            <Bell size={18} />
            {requests.some((request) => request.status === "Pending" && String(request.receiver?._id || request.receiver?.id || request.receiver || "") === currentUserId) && <span className="notification-dot" />}
          </button>
          <button className="profile-edit-trigger" onClick={openProfileEditor}>
            <Pencil size={15} /> <span>Edit profile</span>
          </button>
          <UserRound size={18} />
          <span>{user.name || user.email}</span>
          <button className="icon-button" onClick={logout} title="Log out" aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="welcome-row">
        <div>
          <p className="eyebrow">YOUR SKILL-SHARING COMMUNITY</p>
          <h1>Hey, {user.name || "Learner"}! 👋</h1>
          <p>Learn together. Grow together.</p>
        </div>
        <div className="welcome-icon">
          <Users size={36} />
        </div>
      </section>

      <section className="my-profile-summary" aria-labelledby="my-profile-title">
        <div className="my-profile-summary-heading">
          <div>
            <p className="eyebrow">YOUR ACCOUNT</p>
            <h2 id="my-profile-title">My profile</h2>
          </div>
          <button className="profile-edit-trigger" onClick={openProfileEditor}>
            <Pencil size={15} /> <span>Edit profile</span>
          </button>
        </div>
        <div className="my-profile-summary-body">
          <div className="my-profile-avatar" aria-hidden="true">
            {(user.name || "U").charAt(0).toUpperCase()}
          </div>
          <div className="my-profile-summary-details">
            <h3>{user.name || "SkillSwap member"}</h3>
            {user.email && <p className="my-profile-email">{user.email}</p>}
            <p className="my-profile-bio">
              {user.bio?.trim() || "Add a short bio to tell others about yourself."}
            </p>
            <div className="my-profile-meta">
              <div><span>Location</span><strong>{user.location?.trim() || "Not added yet"}</strong></div>
              <div><span>Experience level</span><strong>{user.experienceLevel || "Beginner"}</strong></div>
            </div>
            <div className="my-profile-skills-grid">
              <div className="my-profile-skill-group">
                <h4>Skills I can teach</h4>
                <div className="my-profile-skill-chips">
                  {(user.skillsToTeach || []).length ? user.skillsToTeach.map((skill) => <span className="my-profile-skill-chip" key={skill}>{skill}</span>) : <p>No teaching skills added yet.</p>}
                </div>
              </div>
              <div className="my-profile-skill-group">
                <h4>Skills I want to learn</h4>
                <div className="my-profile-skill-chips learn-chips">
                  {(user.skillsToLearn || []).length ? user.skillsToLearn.map((skill) => <span className="my-profile-skill-chip" key={skill}>{skill}</span>) : <p>No learning skills added yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <Users />
          <span>People to explore</span>
          <strong>{filteredPeople.length}</strong>
        </article>

        <article className="stat-card">
          <Send />
          <span>My exchange requests</span>
          <strong>{requests.length}</strong>
        </article>

        <article className="stat-card">
          <CheckCircle />
          <span>Accepted exchanges</span>
          <strong>
            {
              requests.filter((r) => r.status?.toLowerCase() === "accepted")
                .length
            }
          </strong>
        </article>

        <article className="stat-card">
          <CheckCircle />
          <span>Completed exchanges</span>
          <strong>
            {
              requests.filter(
                (r) => r.status?.toLowerCase() === "completed"
              ).length
            }
          </strong>
        </article>
      </section>

      <section className="section-heading">
        <div>
          <h2>Discover people</h2>
          <p>Find someone whose skills match your goals.</p>
        </div>

        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search name or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="people-grid">
        {filteredPeople.map((person, index) => (
          <article
            className="person-card"
            key={person._id || person.id || index}
          >
            <div className="avatar">
              {(person.name || "U").charAt(0).toUpperCase()}
            </div>

            <h3>{person.name || "SkillSwap member"}</h3>

            <p className="muted">
              {person.bio || "Ready to learn and share skills"}
            </p>

            <div className="skill-group">
              <strong>
                <BookOpen size={15} /> Can teach
              </strong>
              <div className="skill-tags">
                {(person.skillsToTeach || []).length ? (
                  person.skillsToTeach.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))
                ) : (
                  <span>Skills not added yet</span>
                )}
              </div>
            </div>

            <div className="skill-group">
              <strong>
                <RefreshCw size={15} /> Wants to learn
              </strong>
              <div className="skill-tags">
                {(person.skillsToLearn || []).length ? (
                  person.skillsToLearn.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))
                ) : (
                  <span>Open to learning</span>
                )}
              </div>
            </div>

            <button disabled={busy} onClick={() => sendRequest(person)}>
              <Send size={16} />
              {busy ? "Please wait..." : "Request exchange"}
            </button>
          </article>
        ))}

        {!filteredPeople.length && (
          <p>No matching members found. Try another search.</p>
        )}
      </section>

      <section className="requests-section">
        <h2>
          <RefreshCw size={20} /> Exchange requests
        </h2>

        {!requests.length && (
          <p>No requests yet. Find a member to get started.</p>
        )}

        {requests.map((request, index) => {
          const sender =
            request.requester?.name || request.sender?.name || "Member";

          const receiver = request.receiver?.name || "Member";

          const receiverId = String(
            request.receiver?._id ||
              request.receiver?.id ||
              request.receiver ||
              "",
          );

          const isReceiver = receiverId === currentUserId;

          // return (
          //   <article className="request-row" key={request._id || index}>
          //     <div>
          //       <strong>
          //         {sender} → {receiver}
          //       </strong>

          //       <p>
          //         {request.skillOffered || request.offeredSkill || "Skill"}
          //         {" ↔ "}
          //         {request.skillWanted ||
          //           request.skillRequested ||
          //           request.requestedSkill ||
          //           "Skill"}
          //       </p>

          //        <span className="status">{request.status || "Pending"}</span>

          //       {request.message && <p>{request.message}</p>}
          //     </div>

          //     {isReceiver && request.status === "Pending" && (
          //       <div className="request-actions">
          //         <button
          //           disabled={busy}
          //           onClick={() => acceptRequest(request)}
          //         >
          //           Accept
          //         </button>

          //         <button
          //           disabled={busy}
          //           onClick={() => rejectRequest(request)}
          //         >
          //           Reject
          //         </button>

          //       <span className="status">{request.status || "Pending"}</span>

          //       {request.message && <p>{request.message}</p>}

          //       {request.status === "Accepted" && (
          //         <button
          //           disabled={busy}
          //           onClick={async () => {
          //             if (!window.confirm("Mark this exchange as completed?"))
          //               return;

          //             try {
          //               await apiRequest(`/exchanges/${request._id}/complete`, {
          //                 method: "PATCH",
          //               });

          //               alert("Exchange marked as completed!");
          //               await refreshRequests();
          //             } catch (error) {
          //               alert(error.message || "Could not complete exchange");
          //             }
          //           }}
          //         >
          //           Mark as Completed
          //         </button>
          //       )}
          //     </div>
          //     )}
          //   </article>
          // );

          return (
            <article className="request-row" key={request._id || index}>
              <div>
                <strong>
                  {sender} → {receiver}
                </strong>

                <p>
                  {request.skillOffered || request.offeredSkill || "Skill"}
                  {" ↔ "}
                  {request.skillWanted ||
                    request.skillRequested ||
                    request.requestedSkill ||
                    "Skill"}
                </p>

                <span
                  className={`status status-${(request.status || "Pending").toLowerCase()}`}
                >
                  {request.status || "Pending"}
                </span>

                {request.message && <p>{request.message}</p>}

                {(exchangeReviews[request._id] || []).map((review) => (
                  <div className="submitted-review" key={review._id}>
                    <strong>{review.reviewer?.name || "Member"}</strong>
                    <p>{"⭐".repeat(review.rating || 0)}</p>
                    <p>{review.comment}</p>
                  </div>
                ))}

                {/* {request.status === "Completed" && (
                  <div className="review-form"> */}

                {request.status === "Completed" &&
                  !(exchangeReviews[request._id] || []).some(
                    (review) =>
                      String(
                        review.reviewer?._id ||
                          review.reviewer?.id ||
                          review.reviewer,
                      ) === currentUserId,
                  ) && (
                    <div className="review-form">
                      <h4>Leave a Review</h4>

                      <label>Rating</label>
                      <select
                        value={reviewRatings[request._id] || "5"}
                        onChange={(e) =>
                          setReviewRatings({
                            ...reviewRatings,
                            [request._id]: e.target.value,
                          })
                        }
                      >
                        <option value="5">⭐ 5 - Excellent</option>
                        <option value="4">⭐ 4 - Very Good</option>
                        <option value="3">⭐ 3 - Good</option>
                        <option value="2">⭐ 2 - Fair</option>
                        <option value="1">⭐ 1 - Poor</option>
                      </select>

                      <textarea
                        placeholder="Write your feedback..."
                        value={reviewComments[request._id] || ""}
                        onChange={(e) =>
                          setReviewComments({
                            ...reviewComments,
                            [request._id]: e.target.value,
                          })
                        }
                      />

                      <button
                        onClick={() =>
                          submitReview(
                            request._id,
                            reviewRatings[request._id] || "5",
                            reviewComments[request._id] || "",
                          )
                        }
                      >
                        Submit Review
                      </button>
                    </div>
                  )}
              </div>

              {isReceiver && request.status === "Pending" && (
                <div className="request-actions">
                  <button
                    disabled={busy}
                    onClick={() => acceptRequest(request)}
                  >
                    Accept
                  </button>

                  <button
                    disabled={busy}
                    onClick={() => rejectRequest(request)}
                  >
                    Reject
                  </button>
                </div>
              )}

              {(isReceiver ||
                String(
                  request.requester?._id ||
                    request.requester?.id ||
                    request.requester ||
                    "",
                ) === currentUserId) &&
                request.status === "Accepted" && (
                  <button
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm("Mark this exchange as completed?"))
                        return;

                      try {
                        await apiRequest(`/exchanges/${request._id}/complete`, {
                          method: "PATCH",
                        });

                        alert("Exchange marked as completed!");
                        await refreshRequests();
                      } catch (error) {
                        alert(error.message || "Could not complete exchange");
                      }
                    }}
                  >
                    Mark as Completed
                  </button>
                )}
            </article>
          );
        })}
      </section>

      {notificationsOpen && (
        <section className="notification-panel" aria-label="Activity notifications">
          <div className="notification-panel-heading"><h3>Activity</h3><button className="icon-button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={16} /></button></div>
          {requests.length === 0 ? <p>No activity yet. Exchange updates will appear here.</p> : requests.slice(0, 8).map((request) => {
            const isIncoming = String(request.receiver?._id || request.receiver?.id || request.receiver || "") === currentUserId;
            const otherName = isIncoming ? (request.requester?.name || request.sender?.name || "A member") : (request.receiver?.name || "A member");
            return <div className="notification-item" key={request._id}>
              <span className={`notification-status status-${(request.status || "Pending").toLowerCase()}`} />
              <div><strong>{request.status === "Pending" && isIncoming ? "New exchange request" : `Exchange ${request.status || "updated"}`}</strong><p>{otherName} · {request.skillOffered || "Skill exchange"} ↔ {request.skillWanted || "Skill exchange"}</p></div>
            </div>;
          })}
        </section>
      )}

      {profileOpen && createPortal(
        <div className="modal-backdrop profile-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}>
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
            <div className="profile-modal-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h2 id="profile-modal-title">Edit profile</h2><p>Help others understand what you can share and learn.</p></div><button className="icon-button" onClick={() => setProfileOpen(false)} aria-label="Close profile editor"><X size={18} /></button></div>
            <form onSubmit={saveProfile} className="profile-form">
              <label>Full name<input required minLength={2} maxLength={50} value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /></label>
              <label>Bio<textarea maxLength={500} rows={3} placeholder="A little about you..." value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} /></label>
              <label>Location<input maxLength={100} placeholder="City, country" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} /></label>
              <label>Experience level<select value={profileForm.experienceLevel} onChange={(e) => setProfileForm({ ...profileForm, experienceLevel: e.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
              <label>Skills you can teach <span className="form-hint">Separate skills with commas</span><textarea rows={2} placeholder="React, Excel, Photography" value={profileForm.skillsToTeach} onChange={(e) => setProfileForm({ ...profileForm, skillsToTeach: e.target.value })} /></label>
              <label>Skills you want to learn <span className="form-hint">Separate skills with commas</span><textarea rows={2} placeholder="UI/UX, Public speaking" value={profileForm.skillsToLearn} onChange={(e) => setProfileForm({ ...profileForm, skillsToLearn: e.target.value })} /></label>
              <div className="profile-form-actions"><button type="button" className="secondary-button" onClick={() => setProfileOpen(false)}>Cancel</button><button type="submit" disabled={profileBusy}>{profileBusy ? "Saving..." : "Save profile"}</button></div>
            </form>
          </section>
        </div>,
        document.body,
      )}

      <footer>SkillSwap · Share skills, build connections.</footer>
    </main>
  );
}
