window.addEventListener("load", function (event) {
    setTimeout(function () {
        document.querySelector("#loading").style.display = "none";
        document.querySelector("#body").style.display = "block";
    }, 1000);

    const vueapp = Vue.createApp({
        data() {
            return {
                Typepass: true,
                PasswordOfFile: ""
            };
        },
        methods: {
            SubmitPassword: function (id) {
                // Send the password which the user wrote to the server to check if it is correct.
                console.log(this.PasswordOfFile);
                axios
                    .post("/ConfirmPassword", {
                        FilePassword: this.PasswordOfFile,
                        FileID: id
                    })
                    .then(
                        function (response) {
                            if (response.data.Correct) {
                                // If the password is correct, refresh the site to the active JWT token to not ask for the password anymore.
                                location.reload();
                            } else {
                                // If the password isn't correct, give an error to the user.
                                this.PasswordOfFile = "";
                                Swal.fire({
                                    title: "Error!",
                                    text: "Password is wrong!",
                                    icon: "error",
                                    confirmButtonText: "Okay"
                                });
                            }
                        }.bind(this)
                    )
                    .catch(function (error) {
                        console.log(error);
                    });
            },
            copy: async function (link) {
                // Copy photo's link to clipboard.
                await navigator.clipboard.writeText(link);
                const Toast = Swal.mixin({
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener("mouseenter", Swal.stopTimer);
                        toast.addEventListener("mouseleave", Swal.resumeTimer);
                    }
                });
                Toast.fire({
                    icon: "success",
                    title: "Link coppied!"
                });
            }
        }
    });
    vueapp.mount("#app");
});
